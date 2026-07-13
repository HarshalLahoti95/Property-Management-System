"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./src/app.module");
const lease_status_service_1 = require("./src/modules/lease/lease-status.service");
const prisma_service_1 = require("./src/database/prisma.service");
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function run() {
    console.log('Booting NestJS...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: ['error', 'warn'] });
    const leaseStatusService = app.get(lease_status_service_1.LeaseStatusService);
    const prisma = app.get(prisma_service_1.PrismaService);
    try {
        console.log('1. Finding Users & Unit...');
        const admin = await prisma.user.findFirst({ where: { role: client_1.UserRole.ADMIN } });
        const landlord = await prisma.user.findFirst({ where: { role: client_1.UserRole.LANDLORD } });
        const tenants = await prisma.user.findMany({ where: { role: client_1.UserRole.TENANT }, take: 2 });
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
                data: { propertyId: propId, landlordId: landlord.id, unitNumber: 'SMOKE-01', occupancyStatus: 'VACANT', bedCount: 1, bathCount: 1, floorLevel: 1, squareFootage: 800, targetRent: 1500 }
            });
            console.log(`Created new unit ${unit.id}`);
        }
        else {
            console.log(`Found existing VACANT unit ${unit.id}`);
        }
        const adminCaller = { id: admin.id, role: admin.role };
        const landlordCaller = { id: landlord.id, role: landlord.role };
        const tenant1Caller = { id: tenants[0].id, role: tenants[0].role };
        const tenant2Caller = { id: tenants[1].id, role: tenants[1].role };
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
        const checkDocs = async (purpose) => {
            const doc = await prisma.leaseDocument.findFirst({
                where: { leaseId: lease.id, purpose: purpose },
                include: { document: true },
                orderBy: { createdAt: 'desc' }
            });
            if (!doc) {
                console.error(`Missing ${purpose} document!`);
                return null;
            }
            const p = path.join(__dirname, doc.document.storageUrl.startsWith('uploads') ? doc.document.storageUrl : 'uploads/' + doc.document.storageUrl.split('uploads/')[1]);
            let size = 0;
            if (fs.existsSync(p)) {
                size = fs.statSync(p).size;
            }
            console.log(`Document: ${purpose} => ID: ${doc.documentId}, File: ${p}, Size: ${size} bytes`);
            if (size === 0)
                console.error(`WARNING: File is empty or not found on disk at ${p}. storageUrl was ${doc.document.storageUrl}`);
            return doc;
        };
        // wait a brief moment for async document generation if it detached
        await new Promise(r => setTimeout(r, 2000));
        const draftDoc = await checkDocs('DRAFT_PREVIEW');
        console.log('3. submitForLandlordApproval()...');
        await leaseStatusService.submitForLandlordApproval(lease.id, adminCaller);
        console.log('4. approveLease()...');
        const approvedLease = await leaseStatusService.approveLease(lease.id, landlordCaller);
        console.log(`Lease status is now: ${approvedLease.status}`);
        await new Promise(r => setTimeout(r, 2000));
        const sigDoc = await checkDocs('TENANT_SIGNATURE_COPY');
        console.log('5. signLease() (Tenant 1)...');
        const s1 = await leaseStatusService.signLease(lease.id, tenant1Caller);
        console.log(`Lease status after T1: ${s1.status}`);
        console.log('6. signLease() (Tenant 2)...');
        const s2 = await leaseStatusService.signLease(lease.id, tenant2Caller);
        console.log(`Lease status after T2: ${s2.status}`);
        await new Promise(r => setTimeout(r, 2000));
        const execDoc = await checkDocs('EXECUTED');
        if (execDoc && sigDoc && execDoc.document.previousDocumentId === sigDoc.documentId) {
            console.log(`SUCCESS: EXECUTED document has previousDocumentId correctly mapped to TENANT_SIGNATURE_COPY (${sigDoc.documentId})`);
        }
        else {
            console.log(`FAIL: previousDocumentId mismatch. Expected: ${sigDoc?.documentId}, Got: ${execDoc?.document?.previousDocumentId}`);
        }
        console.log('\n--- CLEANUP PLAN ---');
        console.log(`We will need to delete Lease ${lease.id}`);
        console.log(`We will need to delete LeaseTenants for Lease ${lease.id}`);
        console.log(`We will need to delete LeaseStatusHistory for Lease ${lease.id}`);
        console.log(`We will need to delete Document/LeaseDocument for Lease ${lease.id}`);
        console.log(`We will need to set Unit ${unit.id} back to VACANT`);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        await app.close();
    }
}
run();
