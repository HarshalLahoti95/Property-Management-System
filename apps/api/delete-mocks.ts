import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const documentIds = [
  '3914447f-6bfb-4b4a-83f9-05df8c422ca4',
  '0fa68842-2624-4189-97f8-59a2d52a2ab5',
  '5d23b6cd-9733-407d-8854-d6967937bf9c',
  '720c2b13-cc71-473d-b05b-ae04c21b5539',
  'cc1c7dac-4023-410c-a8c7-860c9828791e'
];

const files = [
  'df6f7bd2-f788-4eb5-81de-fb5900133f78.pdf',
  '415780c3-1f4e-40ef-a8e9-7cba56f8a90c.pdf',
  'f722dfbb-a00f-4704-83ae-693d1b33b280.pdf',
  '8b2ff632-bff0-4c18-9693-58be176c5290.pdf',
  'e3f727b9-0d39-4bc3-a9f5-5c5cdabc278b.pdf'
];

async function main() {
  console.log('--- DB Deletion ---');
  // Delete LeaseDocument rows first due to foreign key
  const ldDeleted = await prisma.leaseDocument.deleteMany({
    where: { documentId: { in: documentIds } }
  });
  console.log(`Deleted ${ldDeleted.count} LeaseDocument rows.`);

  let docCount = 0;
  for (const docId of documentIds) {
    try {
      await prisma.document.delete({ where: { id: docId } });
      docCount++;
    } catch (e) {
      console.log(`Failed to delete document ${docId}:`, e);
    }
  }
  console.log(`Deleted ${docCount} Document rows.`);

  console.log('\n--- File Deletion ---');
  let fileCount = 0;
  for (const filename of files) {
    const filePath = path.join(process.cwd(), 'uploads', 'lease_agreement', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filename}`);
      fileCount++;
    } else {
      console.log(`File not found: ${filename}`);
    }
  }
  console.log(`Total files deleted: ${fileCount}`);

  console.log('\n--- Verification ---');
  const remainingDocs = await prisma.document.count({
    where: { id: { in: documentIds } }
  });
  console.log(`Remaining Document rows (should be 0): ${remainingDocs}`);

  const remainingFiles = files.filter(f => fs.existsSync(path.join(process.cwd(), 'uploads', 'lease_agreement', f)));
  console.log(`Remaining files (should be 0): ${remainingFiles.length}`);

  const leaseCheck = await prisma.lease.findUnique({
    where: { id: '745d157c-a692-486b-9632-4b9223d8ea44' },
  });
  if (leaseCheck) {
    console.log(`Lease 745d157c... exists! Status: ${leaseCheck.status}`);
  } else {
    console.log('ERROR: Lease 745d157c... DOES NOT EXIST.');
  }

}

main().finally(() => prisma.$disconnect());
