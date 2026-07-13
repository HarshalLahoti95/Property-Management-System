const { UserRole, LeaseStatus } = require('@prisma/client');
function validateTransition(
    lease,
    oldStatus,
    newStatus,
    user,
) {
    if (oldStatus === LeaseStatus.PENDING_TENANT_SIGNATURE) {
      if (newStatus === LeaseStatus.ACTIVE) {
        if (user.role !== UserRole.TENANT) {
          throw new Error('Only tenants can sign and activate the lease. Role is: ' + user.role + ' type ' + typeof user.role);
        }
        return 'success';
      }
    }
}
console.log(validateTransition({}, 'PENDING_TENANT_SIGNATURE', 'ACTIVE', { role: 'TENANT' }));
console.log(validateTransition({}, 'PENDING_TENANT_SIGNATURE', 'ACTIVE', { role: UserRole.TENANT }));
