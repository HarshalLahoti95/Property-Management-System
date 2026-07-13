import { PrismaClient } from '@prisma/client';

async function test() {
  const prisma = new PrismaClient();
  const docs = await prisma.document.findMany({
    where: { fileSize: { lt: 100 }, deletedAt: null },
    include: { leaseDocuments: true }
  });
  
  console.log('Found mock docs:', docs.length);
  for (const doc of docs) {
    console.log(`- Document ID: ${doc.id}, StorageURL: ${doc.storageUrl}, Size: ${doc.fileSize}`);
  }
  await prisma.$disconnect();
}
test();
