const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantUser = await prisma.user.findFirst({ where: { role: 'TENANT' }});
  
  // Find a lease that's in PENDING_TENANT_SIGNATURE or update one
  let lease = await prisma.lease.findFirst({ where: { status: 'PENDING_TENANT_SIGNATURE' }});
  if (!lease) {
     lease = await prisma.lease.findFirst({ where: { status: 'DRAFT' }});
     await prisma.lease.update({ where: { id: lease.id }, data: { status: 'PENDING_TENANT_SIGNATURE' }});
  }

  // Ensure this tenant is on this lease
  await prisma.leaseTenant.create({ data: { leaseId: lease.id, tenantId: tenantUser.id, status: 'ACTIVE' }}).catch(() => {});

  // Try to transition
  const { LeaseService } = require('./dist/modules/lease/lease.service.js');
  // Wait, I can't easily instantiate a NestJS service without the module context.
}
main().catch(console.error);
