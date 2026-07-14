import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Inject, forwardRef, NotImplementedException } from '@nestjs/common';
import { PaymentRepository } from './payment.repository';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PrismaService } from '../../database/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { ChargeService } from '../accounting/charge.service';
import { LedgerService } from '../accounting/ledger.service';
import { AllocationService } from './allocation.service';
import { Payment, PaymentAllocation, PaymentStatus, ChargeStatus, UserRole, PaymentMethod } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AccountingService))
    private readonly accountingService: AccountingService,
    private readonly chargeService: ChargeService,
    private readonly allocationService: AllocationService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * The sole entry point for recording tenant payments.
   * Enforces exact-amount monthly payments and strict serialization.
   */
  async recordPaymentReceived(
    leaseId: string,
    tenantId: string,
    amount: Prisma.Decimal,
    method: PaymentMethod,
    reference: string | null,
    recordedByUserId: string
  ): Promise<Payment> {
    if (amount.lte(0)) {
      throw new BadRequestException('Payment amount must be strictly greater than zero.');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Lock the Lease row to serialize concurrent payments for the same lease
      const lockedLeases = await tx.$queryRaw<any[]>`
        SELECT id FROM "Lease" 
        WHERE id = ${leaseId} 
        FOR UPDATE
      `;

      if (!lockedLeases || lockedLeases.length === 0) {
        throw new NotFoundException('Lease not found');
      }

      // 2. Validate tenant explicitly belongs to this lease
      const validTenant = await tx.leaseTenant.findFirst({
        where: { leaseId, tenantId },
      });

      if (!validTenant) {
        throw new ForbiddenException('The specified tenant does not belong to this lease.');
      }

      // 3. Determine oldest unsettled billing month
      const oldestMonthData = await this.chargeService.getOldestUnsettledBillingMonth(leaseId, tx);

      if (!oldestMonthData) {
        throw new BadRequestException('There are no outstanding charges to pay.');
      }

      // 4. Exact amount validation
      if (!amount.equals(oldestMonthData.totalRemainingBalance)) {
        throw new BadRequestException(
          `Must pay the exact monthly total. Expected: ${oldestMonthData.totalRemainingBalance.toString()}, Received: ${amount.toString()}`
        );
      }

      // 5. Fetch TRUST ledger (Payment.ledgerId is required for creation)
      const trustLedger = await this.ledgerService.getLedger(leaseId, 'TRUST', tx);

      // 6. Handle unique transactionReference (Generate fallback if missing)
      const txRef = reference || `${method}-${randomUUID().slice(0, 8).toUpperCase()}`;

      // 7. Create Payment row (Catches P2002 for robust concurrency protection)
      let payment: Payment;
      try {
        payment = await tx.payment.create({
          data: {
            leaseId,
            ledgerId: trustLedger.id,
            tenantId,
            amount,
            paymentMethod: method,
            transactionReference: txRef,
            status: PaymentStatus.CLEARED, // Manual exact payments settle immediately
            paymentDate: new Date(), 
            billingMonth: oldestMonthData.billingMonth,
          }
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          const target = error.meta?.target;
          const isLeaseBillingMonth = Array.isArray(target)
            ? target.includes('leaseId') && target.includes('billingMonth')
            : typeof target === 'string' && target.includes('leaseId') && target.includes('billingMonth');
            
          if (isLeaseBillingMonth) {
            throw new ConflictException('A payment has already been recorded for this billing month.');
          }
          throw new ConflictException(`Payment with transaction reference ${txRef} already exists.`);
        }
        throw error;
      }

      // 8. Allocate the payment across the month's charges
      await this.allocationService.executeAllocation(
        payment.id,
        leaseId,
        oldestMonthData.billingMonth,
        amount,
        tx
      );

      // 9. Update the TRUST ledger running balance and append history
      await this.ledgerService.updateBalance(
        {
          ledgerId: trustLedger.id,
          amountDelta: amount,
          triggerEventType: 'PAYMENT',
          triggerEventId: payment.id,
        },
        tx
      );

      // 10. TODO: trigger landlord notification
      // (Using recordedByUserId context if needed for the notification payload)

      return payment;
    });
  }

  /**
   * Retrieves the stripped-down due balance for a tenant.
   * Fetches the oldest unsettled month and its actual charge rows.
   */
  async getDueBalance(leaseId: string) {
    const oldestMonthData = await this.chargeService.getOldestUnsettledBillingMonth(leaseId, this.prisma);

    if (!oldestMonthData) {
      return { billingMonth: null, totalRemainingBalance: '0.00', charges: [] };
    }

    const charges = await this.prisma.rentCharge.findMany({
      where: {
        leaseId,
        billingMonth: oldestMonthData.billingMonth,
        status: { in: [ChargeStatus.UNPAID, ChargeStatus.PARTIALLY_PAID] },
      },
      orderBy: { dueDate: 'asc' },
    });

    return {
      billingMonth: oldestMonthData.billingMonth,
      totalRemainingBalance: oldestMonthData.totalRemainingBalance.toString(),
      charges,
    };
  }

  /**
   * Registers a tenant payment, processes FIFO allocations, and synchronizes the ledger balance.
   */
  async create(dto: CreatePaymentDto, user: { id: string; role: string }): Promise<Payment> {
    const ledger = await this.paymentRepository.validateLedgerAccess(dto.ledgerId, user);

    let tenantId = dto.tenantId;
    if (user.role === UserRole.TENANT) {
      tenantId = user.id;
    }

    if (!tenantId) {
      throw new BadRequestException('tenantId is required for landlords or administrators submitting payments.');
    }

    // Verify tenant exists and is active
    const tenantObj = await this.prisma.user.findFirst({
      where: { id: tenantId, role: UserRole.TENANT, status: 'ACTIVE', deletedAt: null },
    });
    if (!tenantObj) {
      throw new BadRequestException('The specified tenant ID is invalid, inactive, or not a tenant.');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    // Generate unique transaction reference if not supplied
    let txRef = dto.transactionReference;
    if (!txRef) {
      txRef = `${dto.paymentMethod}-${randomUUID().slice(0, 8).toUpperCase()}`;
    }

    // Check for duplicate transactionReference
    const duplicate = await this.prisma.payment.findUnique({
      where: { transactionReference: txRef },
    });
    if (duplicate) {
      throw new ConflictException(`Payment with transaction reference ${txRef} already exists.`);
    }

    const paymentAmount = new Prisma.Decimal(dto.amount);
    const initialStatus = dto.paymentMethod === 'CASH' ? PaymentStatus.PENDING : PaymentStatus.CLEARED;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create the payment record
      const payment = await tx.payment.create({
        data: {
          leaseId: ledger.leaseId,
          billingMonth: new Date(dto.paymentDate),
          ledgerId: dto.ledgerId,
          tenantId: tenantId!,
          amount: paymentAmount,
          paymentMethod: dto.paymentMethod,
          transactionReference: txRef,
          status: initialStatus,
          paymentDate: new Date(dto.paymentDate),
        },
      });

      // If this is a pending CASH payment, do not perform FIFO allocations or ledger updates yet
      if (initialStatus === PaymentStatus.PENDING) {
        return payment;
      }

      // 2. Fetch outstanding charges for this ledger (UNPAID or PARTIALLY_PAID)
      // Sorted FIFO: oldest due date first, then oldest created first
      const outstandingCharges = await tx.rentCharge.findMany({
        where: {
          ledgerId: dto.ledgerId,
          status: { in: [ChargeStatus.UNPAID, ChargeStatus.PARTIALLY_PAID] },
        },
        orderBy: [
          { dueDate: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      let remainingPayment = paymentAmount;

      // 3. Allocate payment to outstanding charges
      for (const charge of outstandingCharges) {
        if (remainingPayment.lte(0)) break;

        const remainingCharge = charge.amount.minus(charge.paidAmount);
        const allocated = Prisma.Decimal.min(remainingCharge, remainingPayment);

        // Create Allocation
        // TODO: placeholder split logic, not final
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            rentChargeId: charge.id,
            landlordShareAmount: allocated,
            companyShareAmount: allocated,
            allocatedAt: new Date(),
          },
        });

        // Delegate RentCharge mutation to ChargeService
        await this.chargeService.applyAllocation(charge.id, allocated, tx);

        remainingPayment = remainingPayment.minus(allocated);
      }

      // 4. Trigger callback to update running balance in Accounting
      await this.accountingService.handlePaymentApplied(dto.ledgerId, payment.id, dto.amount);

      return payment;
    });
  }

  /**
   * Retrieves detail of a payment after checking user permissions.
   */
  async findOne(id: string, user: { id: string; role: string }): Promise<Payment> {
    const payment = await this.paymentRepository.findPaymentById(id);
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found.`);
    }

    await this.paymentRepository.validateLedgerAccess(payment.ledgerId, user);
    return payment;
  }

  /**
   * Lists payments with scoping and filtering.
   */
  async findAll(
    query: PaymentQueryDto,
    user: { id: string; role: string },
  ): Promise<{
    data: Payment[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (query.page - 1) * query.limit;
    const landlordId = user.role === UserRole.LANDLORD ? user.id : undefined;

    // Enforce Tenant scoping check
    if (user.role === UserRole.TENANT) {
      if (query.tenantId && query.tenantId !== user.id) {
        throw new ForbiddenException('You can only retrieve your own payments.');
      }
      query.tenantId = user.id;
    }

    if (query.ledgerId) {
      await this.paymentRepository.validateLedgerAccess(query.ledgerId, user);
    }

    const searchParams = {
      skip,
      take: query.limit,
      ledgerId: query.ledgerId,
      tenantId: query.tenantId,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      landlordId,
    };

    const [data, total] = await Promise.all([
      this.paymentRepository.findPayments(searchParams),
      this.paymentRepository.countPayments(searchParams),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
    };
  }

  /**
   * Returns allocation history for a target payment.
   */
  async findHistory(paymentId: string, user: { id: string; role: string }): Promise<PaymentAllocation[]> {
    const payment = await this.paymentRepository.findPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found.`);
    }

    await this.paymentRepository.validateLedgerAccess(payment.ledgerId, user);
    return this.paymentRepository.findAllocationsByPaymentId(paymentId);
  }

  /**
   * Handles full or partial refunds by creating a refund payment and reversing allocations.
   */
  async refund(
    paymentId: string,
    dto: RefundPaymentDto,
    user: { id: string; role: string },
  ): Promise<Payment> {
    throw new NotImplementedException('Refund processing is explicitly out of scope for v1. No data will be modified.');
  }

  /**
   * Approves/confirms a pending CASH payment, executing FIFO allocations and updating ledger balances.
   */
  async approve(id: string, user: { id: string; role: string }): Promise<Payment> {
    const payment = await this.paymentRepository.findPaymentById(id);
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found.`);
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending payments can be approved.');
    }

    if (payment.paymentMethod !== 'CASH') {
      throw new BadRequestException('Only cash payments require landlord confirmation.');
    }

    // Verify access
    await this.paymentRepository.validateLedgerAccess(payment.ledgerId, user);

    if (user.role !== UserRole.LANDLORD) {
      throw new ForbiddenException('Only landlords can approve cash payments.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update status to CLEARED
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: { status: PaymentStatus.CLEARED },
      });

      // 2. Run FIFO allocations
      const outstandingCharges = await tx.rentCharge.findMany({
        where: {
          ledgerId: payment.ledgerId,
          status: { in: [ChargeStatus.UNPAID, ChargeStatus.PARTIALLY_PAID] },
        },
        orderBy: [
          { dueDate: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      let remainingPayment = payment.amount;

      for (const charge of outstandingCharges) {
        if (remainingPayment.lte(0)) break;

        const remainingCharge = charge.amount.minus(charge.paidAmount);
        const allocated = Prisma.Decimal.min(remainingCharge, remainingPayment);

        // TODO: placeholder split logic, not final
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            rentChargeId: charge.id,
            landlordShareAmount: allocated,
            companyShareAmount: allocated,
            allocatedAt: new Date(),
          },
        });

        // Delegate RentCharge mutation to ChargeService
        await this.chargeService.applyAllocation(charge.id, allocated, tx);

        remainingPayment = remainingPayment.minus(allocated);
      }

      // 3. Update the ledger balance
      await this.accountingService.handlePaymentApplied(payment.ledgerId, payment.id, payment.amount.toNumber());

      return updatedPayment;
    });
  }
}
