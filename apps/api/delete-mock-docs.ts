import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
  const prisma = new PrismaClient();
  const docs = await prisma.document.findMany({
    where: { fileSize: { lt: 100 } }
  });
  
  console.log('Deleting mock docs:', docs.length);
  for (const doc of docs) {
    // delete LeaseDocuments
    await prisma.leaseDocument.deleteMany({ where: { documentId: doc.id } });
    // delete Document
    await prisma.document.delete({ where: { id: doc.id } });
    console.log(`Deleted DB row for ${doc.id}`);
    
    // delete from disk
    const pathsToCheck = [
      path.join(__dirname, 'uploads', doc.storageUrl),
      path.join(__dirname, 'uploads_test', doc.storageUrl)
    ];
    for (const p of pathsToCheck) {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        console.log(`Deleted file: ${p}`);
      }
    }
  }
  await prisma.$disconnect();
}
test();
