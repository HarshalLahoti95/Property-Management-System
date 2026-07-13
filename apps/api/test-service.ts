import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { LeaseStatusService } from './src/modules/lease/lease-status.service';
import { PrismaService } from './src/database/prisma.service';
import { UserRole } from '@prisma/client';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const leaseStatusService = app.get(LeaseStatusService);
  const prisma = app.get(PrismaService);

  const tenantUser = (await prisma.user.findFirst({ where: { role: 'TENANT' }})) as any;
  const user = { id: tenantUser.id, role: tenantUser.role };
  
  // Find a pending tenant signature lease
  let lease = (await prisma.lease.findFirst({ where: { status: 'PENDING_TENANT_SIGNATURE' }})) as any;
  if (!lease) {
     lease = (await prisma.lease.findFirst({ where: { status: 'DRAFT' }})) as any;
     await prisma.lease.update({ where: { id: lease.id }, data: { status: 'PENDING_TENANT_SIGNATURE' }});
  }

  // Ensure this tenant is on this lease
  const existing = await prisma.leaseTenant.findFirst({ where: { leaseId: lease.id, tenantId: user.id }});
  if (!existing) {
     await prisma.leaseTenant.create({ data: { leaseId: lease.id, tenantId: user.id, status: 'ACTIVE' }});
  }

  try {
     console.log("Attempting transition...");
     const res = await leaseStatusService.signLease(lease.id, user);
     console.log("Success! New status:", res.status);
  } catch (err: any) {
     console.error("Transition failed:", err.message);
  }

  await app.close();
}
bootstrap();
