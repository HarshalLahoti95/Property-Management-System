import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const docs = await prisma.document.findMany({
    where: { fileSize: { lt: 100 } }
  });
  console.log(JSON.stringify(docs, null, 2));
}
main().finally(() => prisma.$disconnect());
