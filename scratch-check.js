const { LeaseStatus } = require('@prisma/client');
const user = { role: 'TENANT' };
const oldStatus = 'PENDING_TENANT_SIGNATURE';
const newStatus = 'ACTIVE';

if (oldStatus === 'PENDING_TENANT_SIGNATURE') {
  if (newStatus === 'ACTIVE') {
    if (user.role?.toUpperCase() !== 'TENANT' && user.role?.toUpperCase() !== 'ADMIN') {
      console.log('Only tenants can sign and activate the lease.');
    } else {
      console.log('Validation passed!');
    }
  }
}
