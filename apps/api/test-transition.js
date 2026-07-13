const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const leaseId = '622a29f3-b85f-4d82-8b66-6596a5875b31'; // Or whatever
  const tenantUser = await prisma.user.findFirst({ where: { role: 'TENANT' }});
  console.log("Tenant user:", tenantUser.role);
}
test().catch(console.error);
