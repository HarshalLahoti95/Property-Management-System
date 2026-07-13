const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const tenantUser = await prisma.user.findFirst({ where: { role: 'TENANT' }});
  
  // Make a lease pending tenant signature
  let lease = await prisma.lease.findFirst({ where: { status: 'PENDING_TENANT_SIGNATURE' }});
  if (!lease) {
     lease = await prisma.lease.findFirst({ where: { status: 'DRAFT' }});
     await prisma.lease.update({ where: { id: lease.id }, data: { status: 'PENDING_TENANT_SIGNATURE' }});
  }

  // Ensure this tenant is on this lease
  const existing = await prisma.leaseTenant.findFirst({ where: { leaseId: lease.id, tenantId: tenantUser.id }});
  if (!existing) {
     await prisma.leaseTenant.create({ data: { leaseId: lease.id, tenantId: tenantUser.id, status: 'ACTIVE' }});
  }

  // Get token - use proper auth flow. Wait, tenant logs in with OTP, not password?
  // Let's check if tenant can login with password in admin/login?
  // No, tenants use OTP.
  // We can just generate a token using the JwtService or just query the DB for the JWT secret.
}
run().catch(console.error);
