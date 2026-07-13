import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { LeaseService } from './src/modules/lease/lease.service';
import { PrismaClient } from '@prisma/client';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const leaseService = app.get(LeaseService);
  const prisma = new PrismaClient();
  
  const tenant = await prisma.user.findFirst({ where: { role: 'TENANT' } });
  const landlord = await prisma.user.findFirst({ where: { role: 'LANDLORD' } });
  let unit = await prisma.unit.findFirst();
  
  if (!tenant || !landlord || !unit) {
    console.log("Missing tenant, landlord, or unit.");
    process.exit(1);
  }

  // Make unit vacant for test
  const oldStatus = unit.occupancyStatus;
  await prisma.unit.update({ where: { id: unit.id }, data: { occupancyStatus: 'VACANT' }});

  const dto = {
    unitId: unit.id,
    startDate: '2026-08-01T00:00:00Z',
    endDate: '2027-07-31T00:00:00Z',
    monthlyRent: 2000,
    securityDeposit: 2000,
    rentDueDay: 1,
    gracePeriodDays: 5,
    tenantIds: [tenant.id]
  };

  console.log("Creating lease...");
  try {
    const lease = await leaseService.create(dto, { id: landlord.id, role: 'LANDLORD' });
    console.log(`Created lease with ID: ${lease.id}`);
    
    const docs = await prisma.leaseDocument.findMany({ where: { leaseId: lease.id } });
    console.log(`Found ${docs.length} LeaseDocument rows.`);
    
    if (docs.length > 0) {
      const doc = await prisma.document.findUnique({ where: { id: docs[0].documentId } });
      console.log(`First doc ID: ${doc?.id}, Size: ${doc?.fileSize}, storageUrl: ${doc?.storageUrl}`);
    } else {
      console.log("NO DOCUMENT ROWS CREATED!");
    }
  } catch (err) {
    console.error("Error creating lease:", err);
  }
  
  await prisma.unit.update({ where: { id: unit.id }, data: { occupancyStatus: oldStatus }});

  await app.close();
  await prisma.$disconnect();
}
bootstrap().catch(console.error);
