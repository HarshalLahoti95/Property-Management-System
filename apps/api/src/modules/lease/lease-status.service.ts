import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LeaseRepository } from './lease.repository';
import { NotificationEventBus } from '../notification/notification.service';
import { LeaseDocumentGeneratorService } from './services/lease-document-generator.service';
import { Lease, LeaseStatus, UnitOccupancyStatus, LeaseTenantStatus, LeaseDocumentPurpose } from '@prisma/client';

const CANCELLABLE_STATUSES: LeaseStatus[] = [
  LeaseStatus.DRAFT,
  LeaseStatus.PENDING_LANDLORD_APPROVAL,
  LeaseStatus.PENDING_TENANT_SIGNATURE,
];

const TERMINAL_STATUSES: LeaseStatus[] = [
  LeaseStatus.CANCELLED,
  LeaseStatus.REJECTED,
  LeaseStatus.DECLINED,
  LeaseStatus.EXPIRED,
  LeaseStatus.TERMINATED,
];

type CallerUser = { id: string; role: string };

@Injectable()
export class LeaseStatusService {
  private readonly logger = new Logger(LeaseStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaseRepository: LeaseRepository,
    private readonly eventBus: NotificationEventBus,
    private readonly leaseDocumentGeneratorService: LeaseDocumentGeneratorService,
  ) {}

  private normalizeRole(user: CallerUser): string {
    const role = Array.isArray(user.role) ? user.role[0] : user.role;
    return typeof role === 'string' ? role.toUpperCase().trim() : '';
  }

  private async loadLease(id: string): Promise<Lease & Record<string, any>> {
    const lease = await this.leaseRepository.findActiveById(id);
    if (!lease) throw new NotFoundException(`Lease with ID ${id} not found.`);
    return lease as Lease & Record<string, any>;
  }

  private assertNotTerminal(lease: Lease): void {
    if (TERMINAL_STATUSES.includes(lease.status)) {
      throw new BadRequestException(
        `Lease is in terminal status ${lease.status} and cannot be transitioned further.`,
      );
    }
  }

  private emitSafe(event: string, payload: Record<string, any>): void {
    try {
      this.eventBus.emit(event, payload);
    } catch (err) {
      this.logger.warn(`Failed to emit ${event}: ${(err as Error).message}`);
    }
  }

  /**
   * Universal internal persister for all state transitions (except initial creation).
   */
  private async persistTransition(
    leaseId: string,
    unitId: string,
    oldStatus: LeaseStatus,
    newStatus: LeaseStatus,
    changedByUserId: string,
    reasonDescription?: string,
  ): Promise<Lease> {
    return this.prisma.$transaction(async (tx) => {
      let newOccupancy: UnitOccupancyStatus | null = null;

      if (newStatus === LeaseStatus.ACTIVE) {
        // Concurrency guard
        const current = await tx.lease.findFirst({
          where: { id: leaseId, deletedAt: null },
        });
        if (!current) throw new NotFoundException(`Lease ${leaseId} not found.`);

        const overlap = await tx.lease.findFirst({
          where: {
            unitId,
            status: LeaseStatus.ACTIVE,
            deletedAt: null,
            id: { not: leaseId },
            OR: [{ startDate: { lte: current.endDate }, endDate: { gte: current.startDate } }],
          },
        });
        if (overlap) {
          throw new BadRequestException('An overlapping active lease already exists for this unit.');
        }
        newOccupancy = UnitOccupancyStatus.OCCUPIED;
      } else if (TERMINAL_STATUSES.includes(newStatus)) {
        newOccupancy = UnitOccupancyStatus.VACANT;
      } else if (newStatus === LeaseStatus.PENDING_TERMINATION_APPROVAL) {
        newOccupancy = UnitOccupancyStatus.NOTICE_GIVEN;
      } else if (
        newStatus === LeaseStatus.PENDING_LANDLORD_APPROVAL ||
        newStatus === LeaseStatus.PENDING_TENANT_SIGNATURE
      ) {
        newOccupancy = UnitOccupancyStatus.RESERVED;
      }

      if (newOccupancy !== null) {
        await tx.unit.update({
          where: { id: unitId },
          data: { occupancyStatus: newOccupancy },
        });
      }

      const updated = await tx.lease.update({
        where: { id: leaseId },
        data: { status: newStatus },
      });

      await tx.leaseStatusHistory.create({
        data: {
          leaseId,
          oldStatus,
          newStatus,
          changedByUserId,
          reasonDescription,
        },
      });

      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Atomically creates the draft lease, sets unit to RESERVED, and creates the first history row.
   */
  async createDraft(
    data: {
      unitId: string;
      startDate: Date;
      endDate: Date;
      monthlyRent: number;
      securityDeposit: number;
      rentDueDay: number;
      gracePeriodDays: number;
      tenantIds: string[];
    },
    user: CallerUser,
  ): Promise<Lease> {
    const createdLease = await this.prisma.$transaction(async (tx) => {
      // ATOMIC GUARD: Only reserve the unit if it is currently VACANT.
      const result = await tx.unit.updateMany({
        where: { id: data.unitId, occupancyStatus: UnitOccupancyStatus.VACANT },
        data: { occupancyStatus: UnitOccupancyStatus.RESERVED },
      });

      if (result.count === 0) {
        throw new BadRequestException('Unit is not available for a new lease (must be VACANT).');
      }

      const lease = await tx.lease.create({
        data: {
          unitId: data.unitId,
          startDate: data.startDate,
          endDate: data.endDate,
          monthlyRent: data.monthlyRent,
          securityDeposit: data.securityDeposit,
          rentDueDay: data.rentDueDay,
          gracePeriodDays: data.gracePeriodDays,
          status: LeaseStatus.DRAFT,
          createdByUserId: user.id,
        },
      });

      await Promise.all(
        data.tenantIds.map((tenantId) =>
          tx.leaseTenant.create({
            data: {
              leaseId: lease.id,
              tenantId,
              status: LeaseTenantStatus.PENDING,
            },
          }),
        ),
      );

      await tx.leaseStatusHistory.create({
        data: {
          leaseId: lease.id,
          oldStatus: null,
          newStatus: LeaseStatus.DRAFT,
          changedByUserId: user.id,
          reasonDescription: 'Draft created.',
        },
      });

      return lease;
    });

    try {
      await this.leaseDocumentGeneratorService.generateDocument(
        createdLease.id,
        LeaseDocumentPurpose.DRAFT_PREVIEW,
        user
      );
    } catch (err) {
      this.logger.error(`Failed to generate DRAFT_PREVIEW for lease ${createdLease.id}: ${(err as Error).message}`);
    }

    return createdLease;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSITIONS
  // ─────────────────────────────────────────────────────────────────────────

  async submitForLandlordApproval(leaseId: string, user: CallerUser): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    this.assertNotTerminal(lease);
    if (lease.status !== LeaseStatus.DRAFT) throw new BadRequestException('Expected DRAFT.');
    if (this.normalizeRole(user) !== 'ADMIN') throw new ForbiddenException('Only admins can submit for landlord approval.');

    const updated = await this.persistTransition(
      leaseId, lease.unitId, LeaseStatus.DRAFT, LeaseStatus.PENDING_LANDLORD_APPROVAL, user.id, 'Submitted by admin for landlord review.'
    );

    const landlord = (lease as any).unit?.landlord;
    if (landlord) this.emitSafe('lease.pending_landlord_approval', { email: landlord.email, unitName: (lease as any).unit?.unitNumber || '', userId: landlord.id });
    return updated;
  }

  async submitForTenantSignature(leaseId: string, user: CallerUser): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    this.assertNotTerminal(lease);
    if (lease.status !== LeaseStatus.DRAFT) throw new BadRequestException('Expected DRAFT.');
    if (this.normalizeRole(user) !== 'LANDLORD') throw new ForbiddenException('Only the landlord can send their own lease directly for tenant signature.');

    const updated = await this.persistTransition(
      leaseId, lease.unitId, LeaseStatus.DRAFT, LeaseStatus.PENDING_TENANT_SIGNATURE, user.id, 'Submitted by landlord for tenant signature.'
    );

    const unitName = (lease as any).unit?.unitNumber || '';
    for (const lt of (lease as any).leaseTenants ?? []) {
      if (lt.tenant) this.emitSafe('lease.pending_tenant_signature', { email: lt.tenant.email, unitName, userId: lt.tenant.id });
    }

    try {
      await this.leaseDocumentGeneratorService.generateDocument(
        leaseId,
        LeaseDocumentPurpose.TENANT_SIGNATURE_COPY,
        user
      );
    } catch (err) {
      this.logger.error(`Failed to generate TENANT_SIGNATURE_COPY for lease ${leaseId}: ${(err as Error).message}`);
    }

    return updated;
  }

  async approveLease(leaseId: string, user: CallerUser): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    this.assertNotTerminal(lease);
    if (lease.status !== LeaseStatus.PENDING_LANDLORD_APPROVAL) throw new BadRequestException('Expected PENDING_LANDLORD_APPROVAL.');
    if (this.normalizeRole(user) !== 'LANDLORD') throw new ForbiddenException('Only the landlord can approve a lease.');

    const updated = await this.persistTransition(
      leaseId, lease.unitId, LeaseStatus.PENDING_LANDLORD_APPROVAL, LeaseStatus.PENDING_TENANT_SIGNATURE, user.id
    );

    const unitName = (lease as any).unit?.unitNumber || '';
    for (const lt of (lease as any).leaseTenants ?? []) {
      if (lt.tenant) this.emitSafe('lease.pending_tenant_signature', { email: lt.tenant.email, unitName, userId: lt.tenant.id });
    }

    try {
      await this.leaseDocumentGeneratorService.generateDocument(
        leaseId,
        LeaseDocumentPurpose.TENANT_SIGNATURE_COPY,
        user
      );
    } catch (err) {
      this.logger.error(`Failed to generate TENANT_SIGNATURE_COPY for lease ${leaseId}: ${(err as Error).message}`);
    }

    return updated;
  }

  async rejectLease(leaseId: string, user: CallerUser, reason?: string): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    this.assertNotTerminal(lease);
    if (lease.status !== LeaseStatus.PENDING_LANDLORD_APPROVAL) throw new BadRequestException('Expected PENDING_LANDLORD_APPROVAL.');
    if (this.normalizeRole(user) !== 'LANDLORD') throw new ForbiddenException('Only the landlord can reject a lease at landlord-approval stage.');

    const updated = await this.persistTransition(
      leaseId, lease.unitId, LeaseStatus.PENDING_LANDLORD_APPROVAL, LeaseStatus.REJECTED, user.id, reason ?? 'Rejected by landlord.'
    );

    const landlord = (lease as any).unit?.landlord;
    this.emitSafe('lease.rejected', { unitName: (lease as any).unit?.unitNumber || '', userId: landlord?.id });
    return updated;
  }

  async signLease(leaseId: string, user: CallerUser): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    this.assertNotTerminal(lease);
    if (lease.status !== LeaseStatus.PENDING_TENANT_SIGNATURE) throw new BadRequestException('Expected PENDING_TENANT_SIGNATURE.');
    if (this.normalizeRole(user) !== 'TENANT') throw new ForbiddenException('Only a tenant on the lease can sign it.');

    const callerLeaseTenant = (lease as any).leaseTenants?.find((lt: any) => lt.tenantId === user.id && lt.status !== LeaseTenantStatus.REMOVED);
    if (!callerLeaseTenant) throw new ForbiddenException('You are not listed as a tenant on this lease.');
    if (callerLeaseTenant.signedAt) throw new BadRequestException('You have already signed this lease.');

    const signedLease = await this.prisma.$transaction(async (tx) => {
      await tx.leaseTenant.update({
        where: { id: callerLeaseTenant.id },
        data: { signedAt: new Date(), status: LeaseTenantStatus.ACTIVE },
      });

      const allTenants = await tx.leaseTenant.findMany({ where: { leaseId, status: { not: LeaseTenantStatus.REMOVED } } });
      const allSigned = allTenants.every((lt) => lt.signedAt !== null);

      if (!allSigned) {
        return tx.lease.findFirst({ where: { id: leaseId, deletedAt: null } }) as Promise<Lease>;
      }

      const updated = await this.persistTransition(
        leaseId, lease.unitId, LeaseStatus.PENDING_TENANT_SIGNATURE, LeaseStatus.ACTIVE, user.id, 'All tenants have signed — lease activated.'
      );

      // ─────────────────────────────────────────────────────────────────────
      // TODO: Initialize FinancialLedger rows here (OPERATING + TRUST) and
      // post the initial security deposit charge via AccountingService.
      // Hook point: accountingService.initializeLedgers(leaseId)
      // ─────────────────────────────────────────────────────────────────────

      const unitName = (lease as any).unit?.unitNumber || '';
      for (const lt of (lease as any).leaseTenants ?? []) {
        if (lt.tenant) this.emitSafe('lease.activated', { email: lt.tenant.email, unitName, userId: lt.tenant.id });
      }
      const landlord = (lease as any).unit?.landlord;
      if (landlord) this.emitSafe('lease.activated', { email: landlord.email, unitName, userId: landlord.id });

      return updated;
    });

    if (signedLease.status === LeaseStatus.ACTIVE) {
      try {
        await this.leaseDocumentGeneratorService.generateDocument(
          leaseId,
          LeaseDocumentPurpose.EXECUTED,
          user
        );
      } catch (err) {
        this.logger.error(`Failed to generate EXECUTED document for lease ${leaseId}: ${(err as Error).message}`);
      }
    }

    return signedLease;
  }

  async declineLease(leaseId: string, user: CallerUser, reason?: string): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    this.assertNotTerminal(lease);
    if (lease.status !== LeaseStatus.PENDING_TENANT_SIGNATURE) throw new BadRequestException('Expected PENDING_TENANT_SIGNATURE.');
    if (this.normalizeRole(user) !== 'TENANT') throw new ForbiddenException('Only a tenant on the lease can decline it.');

    const callerLeaseTenant = (lease as any).leaseTenants?.find((lt: any) => lt.tenantId === user.id && lt.status !== LeaseTenantStatus.REMOVED);
    if (!callerLeaseTenant) throw new ForbiddenException('You are not listed as a tenant on this lease.');

    return this.prisma.$transaction(async (tx) => {
      await tx.leaseTenant.update({ where: { id: callerLeaseTenant.id }, data: { declinedAt: new Date() } });

      const updated = await this.persistTransition(
        leaseId, lease.unitId, LeaseStatus.PENDING_TENANT_SIGNATURE, LeaseStatus.DECLINED, user.id, reason ?? 'Declined by tenant.'
      );

      const landlord = (lease as any).unit?.landlord;
      if (landlord) this.emitSafe('lease.declined', { email: landlord.email, unitName: (lease as any).unit?.unitNumber || '', userId: landlord.id });

      return updated;
    });
  }

  async cancelLease(leaseId: string, user: CallerUser, reason?: string): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    if (!CANCELLABLE_STATUSES.includes(lease.status)) {
      throw new BadRequestException(`Cannot cancel. Expected one of: ${CANCELLABLE_STATUSES.join(', ')}.`);
    }
    if (this.normalizeRole(user) !== 'LANDLORD') {
      throw new ForbiddenException('Only the landlord can cancel a pre-active lease.');
    }

    const updated = await this.persistTransition(
      leaseId, lease.unitId, lease.status, LeaseStatus.CANCELLED, user.id, reason ?? 'Cancelled by landlord.'
    );
    this.emitSafe('lease.cancelled', { unitName: (lease as any).unit?.unitNumber || '', userId: user.id });
    return updated;
  }

  async terminateDirectly(leaseId: string, user: CallerUser, reason?: string): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    this.assertNotTerminal(lease);
    if (lease.status !== LeaseStatus.ACTIVE) throw new BadRequestException('Expected ACTIVE.');
    if (this.normalizeRole(user) !== 'LANDLORD') throw new ForbiddenException('Only the landlord can terminate an active lease directly.');

    const updated = await this.persistTransition(
      leaseId, lease.unitId, LeaseStatus.ACTIVE, LeaseStatus.TERMINATED, user.id, reason ?? 'Terminated directly by landlord.'
    );
    
    const unitName = (lease as any).unit?.unitNumber || '';
    for (const lt of (lease as any).leaseTenants ?? []) {
      if (lt.tenant) this.emitSafe('lease.terminated', { email: lt.tenant.email, unitName, userId: lt.tenant.id });
    }
    const landlord = (lease as any).unit?.landlord;
    if (landlord) this.emitSafe('lease.terminated', { email: landlord.email, unitName, userId: landlord.id });
    return updated;
  }

  async requestTermination(leaseId: string, user: CallerUser, reason?: string): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    this.assertNotTerminal(lease);
    if (lease.status !== LeaseStatus.ACTIVE) throw new BadRequestException('Expected ACTIVE.');
    if (this.normalizeRole(user) !== 'ADMIN') throw new ForbiddenException('Only admins can request lease termination approval.');

    const updated = await this.persistTransition(
      leaseId, lease.unitId, LeaseStatus.ACTIVE, LeaseStatus.PENDING_TERMINATION_APPROVAL, user.id, reason ?? 'Termination requested by admin.'
    );

    const landlord = (lease as any).unit?.landlord;
    if (landlord) this.emitSafe('lease.pending_termination_approval', { email: landlord.email, unitName: (lease as any).unit?.unitNumber || '', userId: landlord.id });
    return updated;
  }

  async approveTermination(leaseId: string, user: CallerUser, reason?: string): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    this.assertNotTerminal(lease);
    if (lease.status !== LeaseStatus.PENDING_TERMINATION_APPROVAL) throw new BadRequestException('Expected PENDING_TERMINATION_APPROVAL.');
    if (this.normalizeRole(user) !== 'LANDLORD') throw new ForbiddenException('Only the landlord can approve lease termination.');

    const updated = await this.persistTransition(
      leaseId, lease.unitId, LeaseStatus.PENDING_TERMINATION_APPROVAL, LeaseStatus.TERMINATED, user.id, reason ?? 'Termination approved by landlord.'
    );
    
    const unitName = (lease as any).unit?.unitNumber || '';
    for (const lt of (lease as any).leaseTenants ?? []) {
      if (lt.tenant) this.emitSafe('lease.terminated', { email: lt.tenant.email, unitName, userId: lt.tenant.id });
    }
    const landlord = (lease as any).unit?.landlord;
    if (landlord) this.emitSafe('lease.terminated', { email: landlord.email, unitName, userId: landlord.id });
    return updated;
  }

  async rejectTermination(leaseId: string, user: CallerUser, reason?: string): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    this.assertNotTerminal(lease);
    if (lease.status !== LeaseStatus.PENDING_TERMINATION_APPROVAL) throw new BadRequestException('Expected PENDING_TERMINATION_APPROVAL.');
    if (this.normalizeRole(user) !== 'LANDLORD') throw new ForbiddenException('Only the landlord can reject lease termination.');

    const updated = await this.persistTransition(
      leaseId, lease.unitId, LeaseStatus.PENDING_TERMINATION_APPROVAL, LeaseStatus.ACTIVE, user.id, reason ?? 'Termination rejected by landlord.'
    );
    
    this.emitSafe('lease.termination_rejected', { unitName: (lease as any).unit?.unitNumber || '', userId: user.id });
    return updated;
  }

  async expireLease(leaseId: string): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    if (lease.status !== LeaseStatus.ACTIVE && lease.status !== LeaseStatus.PENDING_TERMINATION_APPROVAL) {
      throw new BadRequestException(`Cannot expire lease in status ${lease.status}. Expected ACTIVE or PENDING_TERMINATION_APPROVAL.`);
    }

    const wasPending = lease.status === LeaseStatus.PENDING_TERMINATION_APPROVAL;
    return this.persistTransition(
      leaseId,
      lease.unitId,
      lease.status,
      LeaseStatus.EXPIRED,
      'SYSTEM',
      wasPending ? 'Automatically expired (overriding pending termination request).' : 'Automatically expired — lease end date has passed.',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DISPATCHER FOR EXISTING REST ENDPOINT
  // ─────────────────────────────────────────────────────────────────────────

  async transitionDispatcher(leaseId: string, dto: { status: LeaseStatus; reasonDescription?: string }, user: CallerUser): Promise<Lease> {
    const lease = await this.loadLease(leaseId);
    
    if (lease.status === LeaseStatus.DRAFT && dto.status === LeaseStatus.PENDING_LANDLORD_APPROVAL) {
      return this.submitForLandlordApproval(leaseId, user);
    }
    if (lease.status === LeaseStatus.DRAFT && dto.status === LeaseStatus.PENDING_TENANT_SIGNATURE) {
      return this.submitForTenantSignature(leaseId, user);
    }
    if (lease.status === LeaseStatus.PENDING_LANDLORD_APPROVAL && dto.status === LeaseStatus.PENDING_TENANT_SIGNATURE) {
      return this.approveLease(leaseId, user);
    }
    if (lease.status === LeaseStatus.PENDING_LANDLORD_APPROVAL && dto.status === LeaseStatus.REJECTED) {
      return this.rejectLease(leaseId, user, dto.reasonDescription);
    }
    if (lease.status === LeaseStatus.PENDING_TENANT_SIGNATURE && dto.status === LeaseStatus.ACTIVE) {
      return this.signLease(leaseId, user);
    }
    if (lease.status === LeaseStatus.PENDING_TENANT_SIGNATURE && dto.status === LeaseStatus.DECLINED) {
      return this.declineLease(leaseId, user, dto.reasonDescription);
    }
    if (CANCELLABLE_STATUSES.includes(lease.status) && dto.status === LeaseStatus.CANCELLED) {
      return this.cancelLease(leaseId, user, dto.reasonDescription);
    }
    if (lease.status === LeaseStatus.ACTIVE && dto.status === LeaseStatus.TERMINATED) {
      return this.terminateDirectly(leaseId, user, dto.reasonDescription);
    }
    if (lease.status === LeaseStatus.ACTIVE && dto.status === LeaseStatus.PENDING_TERMINATION_APPROVAL) {
      return this.requestTermination(leaseId, user, dto.reasonDescription);
    }
    if (lease.status === LeaseStatus.PENDING_TERMINATION_APPROVAL && dto.status === LeaseStatus.TERMINATED) {
      return this.approveTermination(leaseId, user, dto.reasonDescription);
    }
    if (lease.status === LeaseStatus.PENDING_TERMINATION_APPROVAL && dto.status === LeaseStatus.ACTIVE) {
      return this.rejectTermination(leaseId, user, dto.reasonDescription);
    }
    
    throw new BadRequestException(`No valid transition mapping found from ${lease.status} to ${dto.status} for your role.`);
  }
}
