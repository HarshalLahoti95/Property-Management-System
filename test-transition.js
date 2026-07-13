const { UserRole, LeaseStatus } = require('@prisma/client');
const { ForbiddenException, BadRequestException } = require('@nestjs/common');

function validateTransition(lease, oldStatus, newStatus, user) {
  const createdByRole = lease.createdByRole;
  console.log('TRANSITION ATTEMPT:', { oldStatus, newStatus, userRole: user.role, userId: user.id });

  if (oldStatus === LeaseStatus.DRAFT) {
    if (newStatus === LeaseStatus.PENDING_LANDLORD_APPROVAL) {
      if (createdByRole !== 'ADMIN') {
        throw new BadRequestException('Landlord-created leases skip landlord approval. Transition directly to PENDING_TENANT_SIGNATURE.');
      }
      if (user.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can submit admin-created leases for landlord approval.');
      }
      return;
    }
    if (newStatus === LeaseStatus.PENDING_TENANT_SIGNATURE) {
      if (createdByRole !== 'LANDLORD') {
        throw new BadRequestException('Admin-created leases must go through landlord approval first.');
      }
      if (user.role !== 'LANDLORD') {
        throw new ForbiddenException('Only the landlord can send their lease for tenant signature.');
      }
      return;
    }
    throw new BadRequestException(`Invalid status transition from ${oldStatus} to ${newStatus}.`);
  }

  if (oldStatus === LeaseStatus.PENDING_LANDLORD_APPROVAL) {
    if (newStatus === LeaseStatus.PENDING_TENANT_SIGNATURE) {
      if (user.role !== 'LANDLORD') {
        throw new ForbiddenException('Only the landlord can approve and forward the lease to the tenant.');
      }
      return;
    }
    if (newStatus === LeaseStatus.DRAFT) {
      if (user.role !== 'LANDLORD') {
        throw new ForbiddenException('Only the landlord can reject and return a lease to draft.');
      }
      return;
    }
    throw new BadRequestException(`Invalid status transition from ${oldStatus} to ${newStatus}.`);
  }

  if (oldStatus === LeaseStatus.PENDING_TENANT_SIGNATURE) {
    if (newStatus === LeaseStatus.ACTIVE) {
      if (user.role !== 'TENANT') {
        throw new ForbiddenException('Only tenants can sign and activate the lease.');
      }
      return;
    }
    if (newStatus === LeaseStatus.TERMINATED) {
      if (user.role !== 'TENANT') {
        throw new ForbiddenException('Only tenants can reject a lease pending their signature.');
      }
      return;
    }
    throw new BadRequestException(`Invalid status transition from ${oldStatus} to ${newStatus}.`);
  }
}

try {
  validateTransition(
    { createdByRole: 'ADMIN' },
    'PENDING_LANDLORD_APPROVAL',
    'PENDING_TENANT_SIGNATURE',
    { role: 'LANDLORD', id: '123' }
  );
  console.log('LANDLORD APPROVAL OK');
} catch (e) {
  console.error('LANDLORD APPROVAL ERROR:', e.message);
}

try {
  validateTransition(
    { createdByRole: 'ADMIN' },
    'PENDING_TENANT_SIGNATURE',
    'ACTIVE',
    { role: 'TENANT', id: '456' }
  );
  console.log('TENANT SIGNATURE OK');
} catch (e) {
  console.error('TENANT SIGNATURE ERROR:', e.message);
}
