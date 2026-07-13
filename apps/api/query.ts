import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.$queryRaw`
    SELECT 
      ld."leaseId",
      ld.purpose,
      ld."createdAt" as lease_doc_created_at,
      d.id as document_id,
      d."fileSize",
      d."createdAt" as doc_created_at,
      l.status as lease_status
    FROM "LeaseDocument" ld
    JOIN "Document" d ON d.id = ld."documentId"
    JOIN "Lease" l ON l.id = ld."leaseId"
    ORDER BY ld."createdAt" DESC
    LIMIT 20;
  `;
  console.log(JSON.stringify(docs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
