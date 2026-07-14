import { PrismaClient, UserRole, UserStatus, PropertyType, UnitOccupancyStatus, LeaseStatus, LeaseTenantStatus, LedgerType, ChargeType, ChargeStatus, WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const uuidv4 = () => crypto.randomUUID();

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with fabricated data...');

  // Clean up database first to ensure a clean state
  await prisma.leaseStatusHistory.deleteMany();
  await prisma.ledgerBalanceHistory.deleteMany();
  await prisma.rentCharge.deleteMany();
  await prisma.financialLedger.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.leaseTenant.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.passwordCredential.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin
  const adminId = uuidv4();
  await prisma.user.create({
    data: {
      id: adminId,
      email: 'admin@example.com',
      fullName: 'System Admin',
      phone: '555-0000',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordCredential: {
        create: {
          passwordHash: await bcrypt.hash('password123', 10),
        },
      },
    },
  });
  console.log('Created admin');

  // Create Landlord Alice
  const landlordId = uuidv4();
  await prisma.user.create({
    data: {
      id: landlordId,
      email: 'landlord@example.com',
      fullName: 'Alice Landlord',
      phone: '555-0101',
      role: UserRole.LANDLORD,
      status: UserStatus.ACTIVE,
      passwordCredential: {
        create: {
          passwordHash: await bcrypt.hash('password123', 10),
        },
      },
    },
  });
  console.log('Created landlord Alice');

  // Create Landlord Bob
  const landlord2Id = uuidv4();
  await prisma.user.create({
    data: {
      id: landlord2Id,
      email: 'landlord2@example.com',
      fullName: 'Bob Landlord',
      phone: '555-0102',
      role: UserRole.LANDLORD,
      status: UserStatus.ACTIVE,
      passwordCredential: {
        create: {
          passwordHash: await bcrypt.hash('password123', 10),
        },
      },
    },
  });
  console.log('Created landlord Bob');

  // Create Tenants
  const tenantIds: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const tenantId = uuidv4();
    tenantIds.push(tenantId);
    await prisma.user.create({
      data: {
        id: tenantId,
        email: `tenant${i}@example.com`,
        fullName: `Tenant Name ${i}`,
        phone: `555-020${i}`,
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
        passwordCredential: {
          create: {
            passwordHash: await bcrypt.hash('password123', 10),
          },
        },
      },
    });
  }
  console.log('Created 6 tenants');

  // Create Properties for Alice
  const prop1Id = uuidv4();
  const prop2Id = uuidv4();
  
  await prisma.property.create({
    data: {
      id: prop1Id,
      name: 'Sunset Heights',
      type: PropertyType.RESIDENTIAL,
      streetAddress: '100 Sunset Blvd',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
    },
  });

  await prisma.property.create({
    data: {
      id: prop2Id,
      name: 'Oceanview Complex',
      type: PropertyType.RESIDENTIAL,
      streetAddress: '200 Ocean Ave',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400050',
    },
  });
  console.log('Created 2 properties for Alice');

  // Create Property for Bob
  const prop3Id = uuidv4();
  await prisma.property.create({
    data: {
      id: prop3Id,
      name: 'Mountain View Apartments',
      type: PropertyType.RESIDENTIAL,
      streetAddress: '300 Mountain Dr',
      city: 'Pune',
      state: 'Maharashtra',
      zipCode: '411001',
    },
  });
  console.log('Created property for Bob');

  // Create Units under Alice's properties
  const aliceUnits: any[] = [];
  for (let i = 1; i <= 4; i++) {
    const unit = await prisma.unit.create({
      data: {
        propertyId: i <= 2 ? prop1Id : prop2Id,
        landlordId: landlordId,
        unitNumber: `${i}01`,
        floorLevel: i % 2 + 1,
        bedCount: 2,
        bathCount: 1,
        squareFootage: 800,
        targetRent: 15000,
        occupancyStatus: UnitOccupancyStatus.OCCUPIED,
      },
    });
    aliceUnits.push(unit);
  }

  // Create Units under Bob's property
  const bobUnits: any[] = [];
  for (let i = 5; i <= 6; i++) {
    const unit = await prisma.unit.create({
      data: {
        propertyId: prop3Id,
        landlordId: landlord2Id,
        unitNumber: `${i}01`,
        floorLevel: 1,
        bedCount: 2,
        bathCount: 1,
        squareFootage: 900,
        targetRent: 18000,
        occupancyStatus: UnitOccupancyStatus.OCCUPIED,
      },
    });
    bobUnits.push(unit);
  }
  console.log('Created units for Alice and Bob');

  // Helper to create Lease & Ledger & Rent charge
  const createLeaseWithBilling = async (unit: any, tenantId: string, index: number) => {
    const leaseId = uuidv4();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - index);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    await prisma.lease.create({
      data: {
        id: leaseId,
        unitId: unit.id,
        startDate,
        endDate,
        monthlyRent: unit.targetRent,
        securityDeposit: Number(unit.targetRent) * 2,
        rentDueDay: 1,
        gracePeriodDays: 5,
        status: LeaseStatus.ACTIVE,
        leaseTenants: {
          create: {
            tenantId,
            status: LeaseTenantStatus.ACTIVE,
          },
        },
        financialLedgers: {
          create: [
            {
              ledgerType: LedgerType.OPERATING,
              runningBalance: 0,
            },
            {
              ledgerType: LedgerType.TRUST,
              runningBalance: Number(unit.targetRent) * 2,
            },
          ],
        },
      },
    });

    const trustLedger = await prisma.financialLedger.findFirst({
      where: { leaseId, ledgerType: LedgerType.TRUST }
    });

    if (trustLedger) {
      await prisma.rentCharge.create({
        data: {
          leaseId: leaseId,
          ledgerId: trustLedger.id,
          billingMonth: startDate,
          dueDate: new Date(),
          type: ChargeType.RENT,
          amount: unit.targetRent,
          paidAmount: 0,
          status: ChargeStatus.UNPAID,
          description: 'Monthly Rent',
          landlordSharePercentageSnapshot: 100,
        },
      });
    }
  };

  // Create Leases for Alice's units
  for (let i = 0; i < aliceUnits.length; i++) {
    await createLeaseWithBilling(aliceUnits[i], tenantIds[i], i);
  }

  // Create Leases for Bob's units
  for (let i = 0; i < bobUnits.length; i++) {
    await createLeaseWithBilling(bobUnits[i], tenantIds[aliceUnits.length + i], i);
  }
  console.log('Created leases and accounts for Alice and Bob');

  // Create Work Orders
  await prisma.workOrder.create({
    data: {
      propertyId: prop1Id,
      unitId: aliceUnits[0].id,
      workOrderNumber: 'WO-1001',
      title: 'Leaking Faucet',
      description: 'The kitchen sink is leaking from the base.',
      priority: WorkOrderPriority.MEDIUM,
      status: WorkOrderStatus.SUBMITTED,
    },
  });

  await prisma.workOrder.create({
    data: {
      propertyId: prop3Id,
      unitId: bobUnits[0].id,
      workOrderNumber: 'WO-1002',
      title: 'Heater not working',
      description: 'Central heating is blowing cold air.',
      priority: WorkOrderPriority.HIGH,
      status: WorkOrderStatus.IN_PROGRESS,
    },
  });
  console.log('Created work orders');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
