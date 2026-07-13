import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { LeaseStatusService } from '../src/modules/lease/lease-status.service';
import { PrismaService } from '../src/database/prisma.service';
import { LeaseDocumentGeneratorService } from '../src/modules/lease/services/lease-document-generator.service';
import { UserRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

describe('Smoke Test Workflow', () => {
  let leaseStatusService: LeaseStatusService;
  let prisma: PrismaService;
  let leaseDocGenService: LeaseDocumentGeneratorService;
  let app: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    leaseStatusService = app.get(LeaseStatusService);
    prisma = app.get(PrismaService);
    leaseDocGenService = app.get(LeaseDocumentGeneratorService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs the full lease workflow smoke test', async () => {
    console.log('1. Finding Users & Unit...');
    const admin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
    const landlord = await prisma.user.findFirst({ where: { role: UserRole.LANDLORD } });
    const tenants = await prisma.user.findMany({ where: { role: UserRole.TENANT }, take: 2 });
    
    if (!admin || !landlord || tenants.length < 2) {
      throw new Error('Missing required users in DB. Need 1 ADMIN, 1 LANDLORD, 2 TENANTs.');
    }

    let unit = await prisma.unit.findFirst({ 
      where: { occupancyStatus: 'VACANT', landlordId: landlord.id, deletedAt: null } 
    });

    if (!unit) {
      const prop = await prisma.property.findFirst({ where: { deletedAt: null } });
      let propId = prop?.id;
      if (!propId) {
         const p = await prisma.property.create({
           data: { name: 'Smoke Test Prop', type: 'RESIDENTIAL', streetAddress: '123 Smoke', city: 'Smokeville', state: 'SM', zipCode: '12345' }
         });
         propId = p.id;
      }
      unit = await prisma.unit.create({
        data: { propertyId: propId, landlordId: landlord.id, unitNumber: `SMOKE-${Date.now()}`, occupancyStatus: 'VACANT', bedCount: 1, bathCount: 1, floorLevel: 1, squareFootage: 800, targetRent: 1500 }
      });
      console.log(`Created new unit ${unit.id}`);
    } else {
      console.log(`Found existing VACANT unit ${unit.id}`);
    }

    const adminCaller = { id: admin.id, role: admin.role as string };
    const landlordCaller = { id: landlord.id, role: landlord.role as string };
    const tenant1Caller = { id: tenants[0].id, role: tenants[0].role as string };
    const tenant2Caller = { id: tenants[1].id, role: tenants[1].role as string };

    console.log('2. createDraft()...');
    const lease = await leaseStatusService.createDraft({
      unitId: unit.id,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2027-08-01'),
      monthlyRent: 1500,
      securityDeposit: 1500,
      rentDueDay: 1,
      gracePeriodDays: 5,
      tenantIds: [tenant1Caller.id, tenant2Caller.id]
    }, adminCaller);

    console.log(`Lease created: ${lease.id}`);

    const checkDocs = async (purpose: string) => {
      const doc = await prisma.leaseDocument.findFirst({
        where: { leaseId: lease.id, purpose: purpose as any },
        include: { document: true },
        orderBy: { createdAt: 'desc' }
      });
      if (!doc) {
        console.error(`Missing ${purpose} document!`);
        return null;
      }
      const p = path.join(__dirname, '..', doc.document.storageUrl.startsWith('uploads') ? doc.document.storageUrl : 'uploads/' + doc.document.storageUrl.split('uploads/')[1]);
      let size = 0;
      if (fs.existsSync(p)) {
        size = fs.statSync(p).size;
      }
      console.log(`\n==============================================`);
      console.log(`Document: ${purpose} => ID: ${doc.documentId}\nFile: ${p}\nSize: ${size} bytes`);
      console.log(`==============================================\n`);
      if (size === 0) console.error(`WARNING: File is empty or not found on disk at ${p}. storageUrl was ${doc.document.storageUrl}`);
      return doc;
    };

    await new Promise(r => setTimeout(r, 4000));
    const draftDoc1 = await checkDocs('DRAFT_PREVIEW');

    console.log('2.5 Simulating lease update (triggers regeneration of DRAFT_PREVIEW)...');
    await leaseDocGenService.generateDocument(lease.id, 'DRAFT_PREVIEW', adminCaller);
    await new Promise(r => setTimeout(r, 4000));
    const draftDoc2 = await checkDocs('DRAFT_PREVIEW');

    if (draftDoc2 && draftDoc1 && draftDoc2.document.previousDocumentId === draftDoc1.documentId) {
      console.log(`\nSUCCESS: DRAFT_PREVIEW correctly chained to previous DRAFT_PREVIEW (${draftDoc1.documentId})`);
    } else {
      console.log(`\nFAIL: DRAFT_PREVIEW chaining mismatch.`);
    }

    console.log('3. submitForLandlordApproval()...');
    await leaseStatusService.submitForLandlordApproval(lease.id, adminCaller);

    console.log('4. approveLease()...');
    const approvedLease = await leaseStatusService.approveLease(lease.id, landlordCaller);
    console.log(`Lease status is now: ${approvedLease.status}`);

    await new Promise(r => setTimeout(r, 4000));
    const sigDoc = await checkDocs('TENANT_SIGNATURE_COPY');

    console.log('5. signLease() (Tenant 1)...');
    const s1 = await leaseStatusService.signLease(lease.id, tenant1Caller);
    console.log(`Lease status after T1: ${s1.status}`);

    console.log('6. signLease() (Tenant 2)...');
    const s2 = await leaseStatusService.signLease(lease.id, tenant2Caller);
    console.log(`Lease status after T2: ${s2.status}`);

    await new Promise(r => setTimeout(r, 4000));
    const execDoc = await checkDocs('EXECUTED');
    if (execDoc && execDoc.document.previousDocumentId === null) {
      console.log(`\nSUCCESS: EXECUTED document is correctly standalone (no previousDocumentId)`);
    } else {
      console.log(`\nFAIL: EXECUTED document is not standalone. Expected previousDocumentId: null, Got: ${execDoc?.document?.previousDocumentId}`);
    }

    console.log('\n--- CLEANUP PLAN (TODO) ---');
    console.log('TODO: Implement actual cascading teardown for smoke tests.');
    console.log('Currently, the timestamp-based unit generation leaves permanent orphaned test data');
    console.log(`(Unit ${unit.id}, Lease ${lease.id}, LeaseTenant, Document, LeaseDocument rows)`);
    console.log('in the dev DB on every run. A real cascading teardown should be built before');
    console.log('this environment is used for anything beyond quick local iteration.');
    
  }, 60000); // 60s timeout
});
