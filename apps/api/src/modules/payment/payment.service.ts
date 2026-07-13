import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { PaymentRepository } from './payment.repository';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PrismaService } from '../../database/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { Payment, PaymentAllocation, PaymentStatus, ChargeStatus, UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AccountingService))
    private readonly accountingService: AccountingService,
  ) {}

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
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            rentChargeId: charge.id,
            amountAllocated: allocated,
            allocatedAt: new Date(),
          },
        });

        // Update RentCharge progress
        const newPaidAmount = charge.paidAmount.plus(allocated);
        const isPaid = newPaidAmount.equals(charge.amount);

        await tx.rentCharge.update({
          where: { id: charge.id },
          data: {
            paidAmount: newPaidAmount,
            status: isPaid ? ChargeStatus.PAID : ChargeStatus.PARTIALLY_PAID,
          },
        });

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
    if (user.role === UserRole.TENANT) {
      throw new ForbiddenException('Tenants are not authorized to issue refunds.');
    }

    const originalPayment = await this.paymentRepository.findPaymentById(paymentId);
    if (!originalPayment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found.`);
    }

    await this.paymentRepository.validateLedgerAccess(originalPayment.ledgerId, user);

    if (originalPayment.status !== PaymentStatus.CLEARED) {
      throw new BadRequestException('Only cleared payments can be refunded.');
    }

    const refundAmount = dto.amount ? new Prisma.Decimal(dto.amount) : originalPayment.amount;

    if (refundAmount.lte(0)) {
      throw new BadRequestException('Refund amount must be greater than zero.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Check total historical refunds to avoid over-refunding
      const existingRefunds = await tx.payment.findMany({
        where: {
          transactionReference: {
            startsWith: `REFUND-${originalPayment.transactionReference}-`,
          },
        },
      });

      const totalRefunded = existingRefunds.reduce(
        (sum, refund) => sum.plus(refund.amount),
        new Prisma.Decimal(0.00),
      );

      if (totalRefunded.plus(refundAmount).gt(originalPayment.amount)) {
        throw new BadRequestException(
          `Cannot refund ${refundAmount.toString()}. Total refunded so far is ${totalRefunded.toString()} out of original ${originalPayment.amount.toString()}.`,
        );
      }

      // 1. Create a new Refund Payment record
      const refundRef = `REFUND-${originalPayment.transactionReference}-${randomUUID().slice(0, 8)}`;
      const refundPayment = await tx.payment.create({
        data: {
          ledgerId: originalPayment.ledgerId,
          tenantId: originalPayment.tenantId,
          amount: refundAmount,
          paymentMethod: originalPayment.paymentMethod,
          transactionReference: refundRef,
          status: PaymentStatus.REFUNDED,
          paymentDate: new Date(),
        },
      });

      // 2. If fully refunded, mark the original payment status as REFUNDED
      if (totalRefunded.plus(refundAmount).equals(originalPayment.amount)) {
        await tx.payment.update({
          where: { id: originalPayment.id },
          data: { status: PaymentStatus.REFUNDED },
        });
      }

      // 3. Reverse allocations (LIFO - reverse newest allocations first)
      const allocations = await tx.paymentAllocation.findMany({
        where: { paymentId: originalPayment.id },
        include: { rentCharge: true },
        orderBy: { allocatedAt: 'desc' },
      });

      let remainingRefundToReverse = refundAmount;

      for (const allocation of allocations) {
        if (remainingRefundToReverse.lte(0)) break;

        const reversal = Prisma.Decimal.min(allocation.amountAllocated, remainingRefundToReverse);

        // Adjust charge paidAmount and status
        const charge = allocation.rentCharge;
        const newPaidAmount = charge.paidAmount.minus(reversal);
        
        let newStatus: ChargeStatus = ChargeStatus.PARTIALLY_PAID;
        if (newPaidAmount.equals(0)) {
          newStatus = ChargeStatus.UNPAID;
        }

        await tx.rentCharge.update({
          where: { id: charge.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
          },
        });

        // Deduct allocation or delete if fully reversed
        if (reversal.equals(allocation.amountAllocated)) {
          await tx.paymentAllocation.delete({
            where: { id: allocation.id },
          });
        } else {
          await tx.paymentAllocation.update({
            where: { id: allocation.id },
            data: {
              amountAllocated: allocation.amountAllocated.minus(reversal),
            },
          });
        }

        remainingRefundToReverse = remainingRefundToReverse.minus(reversal);
      }

      // 4. Trigger callback with a negative value to increase the ledger's outstanding balance
      await this.accountingService.handlePaymentApplied(
        originalPayment.ledgerId,
        refundPayment.id,
        refundAmount.negated().toNumber(),
      );

      return refundPayment;
    });
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

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            rentChargeId: charge.id,
            amountAllocated: allocated,
            allocatedAt: new Date(),
          },
        });

        const newPaidAmount = charge.paidAmount.plus(allocated);
        const isPaid = newPaidAmount.equals(charge.amount);

        await tx.rentCharge.update({
          where: { id: charge.id },
          data: {
            paidAmount: newPaidAmount,
            status: isPaid ? ChargeStatus.PAID : ChargeStatus.PARTIALLY_PAID,
          },
        });

        remainingPayment = remainingPayment.minus(allocated);
      }

      // 3. Update the ledger balance
      await this.accountingService.handlePaymentApplied(payment.ledgerId, payment.id, payment.amount.toNumber());

      return updatedPayment;
    });
  }
}
