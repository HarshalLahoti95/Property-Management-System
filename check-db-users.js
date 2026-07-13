const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users in database:');
  for (const user of users) {
    console.log(`Email: ${user.email}, Role: ${user.role}, Type: ${typeof user.role}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
