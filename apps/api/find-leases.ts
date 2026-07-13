import { PrismaClient } from '@prisma/client';

async function bootstrap() {
  const prisma = new PrismaClient();
  const leases = await prisma.lease.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { leaseDocuments: { include: { document: true } } }
  });
  
  for (const lease of leases) {
    console.log(`Lease ID: ${lease.id}, Status: ${lease.status}, CreatedAt: ${lease.createdAt}, Docs: ${lease.leaseDocuments.length}`);
    for (const ld of lease.leaseDocuments) {
      console.log(`  - Doc ID: ${ld.document.id}, Size: ${ld.document.fileSize}, URL: ${ld.document.storageUrl}`);
    }
  }
  await prisma.$disconnect();
}
bootstrap();
