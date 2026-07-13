const fs = require('fs');
const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

const doubleEntryStart = content.indexOf('// DOUBLE ENTRY TRUST LEDGER SYSTEM');
const nextSection = content.indexOf('// ==========================================\n// SYSTEM AUDIT MODULES');

const newAccountingModels = `// DOUBLE ENTRY TRUST LEDGER SYSTEM (REBUILT)
// ==========================================

model FinancialLedger {
  id             String     @id @default(uuid())
  leaseId        String
  ledgerType     LedgerType
  runningBalance Decimal    @default(0.00) @db.Decimal(18, 2)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  lease                  Lease                  @relation(fields: [leaseId], references: [id], onDelete: Restrict)
  rentCharges            RentCharge[]
  payments               Payment[]
  ledgerBalanceHistories LedgerBalanceHistory[]

  @@unique([leaseId, ledgerType])
  @@index([leaseId])
}

model RentCharge {
  id           String       @id @default(uuid())
  ledgerId     String
  leaseId      String
  billingMonth DateTime
  type         ChargeType
  amount       Decimal      @db.Decimal(18, 2)
  paidAmount   Decimal      @default(0.00) @db.Decimal(18, 2)
  status       ChargeStatus
  dueDate      DateTime
  description  String
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  ledger             FinancialLedger     @relation(fields: [ledgerId], references: [id], onDelete: Restrict)
  lease              Lease               @relation(fields: [leaseId], references: [id], onDelete: Restrict)
  paymentAllocations PaymentAllocation[]

  @@index([ledgerId])
  @@index([leaseId, status])
  @@index([billingMonth])
  @@index([dueDate])
}

model Payment {
  id                   String        @id @default(uuid())
  ledgerId             String
  leaseId              String
  tenantId             String
  billingMonth         DateTime
  amount               Decimal       @db.Decimal(18, 2)
  paymentMethod        PaymentMethod
  transactionReference String        @unique
  status               PaymentStatus
  paymentDate          DateTime
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  ledger             FinancialLedger     @relation(fields: [ledgerId], references: [id], onDelete: Restrict)
  lease              Lease               @relation(fields: [leaseId], references: [id], onDelete: Restrict)
  tenant             User                @relation("TenantPayments", fields: [tenantId], references: [id], onDelete: Restrict)
  paymentAllocations PaymentAllocation[]

  @@unique([leaseId, billingMonth])
  @@index([ledgerId])
  @@index([leaseId])
  @@index([tenantId])
}

model PaymentAllocation {
  id                  String   @id @default(uuid())
  paymentId           String
  rentChargeId        String
  landlordShareAmount Decimal  @db.Decimal(18, 2)
  companyShareAmount  Decimal  @db.Decimal(18, 2)
  allocatedAt         DateTime @default(now())
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  payment    Payment    @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  rentCharge RentCharge @relation(fields: [rentChargeId], references: [id], onDelete: Restrict)

  @@unique([paymentId, rentChargeId])
  @@index([paymentId])
  @@index([rentChargeId])
}

model LedgerBalanceHistory {
  id               String             @id @default(uuid())
  ledgerId         String
  oldBalance       Decimal            @db.Decimal(18, 2)
  newBalance       Decimal            @db.Decimal(18, 2)
  triggerEventType LedgerTriggerEvent
  triggerEventId   String
  changedAt        DateTime           @default(now())

  ledger FinancialLedger @relation(fields: [ledgerId], references: [id], onDelete: Restrict)

  @@index([ledgerId])
}

model LeaseSharePercentageHistory {
  id                      String   @id @default(uuid())
  leaseId                 String
  landlordSharePercentage Decimal  @db.Decimal(5, 2)
  effectiveFrom           DateTime
  changedByUserId         String
  createdAt               DateTime @default(now())

  lease         Lease @relation(fields: [leaseId], references: [id], onDelete: Restrict)
  changedByUser User  @relation("PercentageHistoryChangedBy", fields: [changedByUserId], references: [id], onDelete: Restrict)

  @@index([leaseId])
  @@index([changedByUserId])
  @@index([effectiveFrom])
}

model ChargeSplitRule {
  id                      String     @id @default(uuid())
  leaseId                 String
  chargeType              ChargeType
  landlordSharePercentage Decimal    @db.Decimal(5, 2)
  createdAt               DateTime   @default(now())
  updatedAt               DateTime   @updatedAt

  lease Lease @relation(fields: [leaseId], references: [id], onDelete: Restrict)

  @@unique([leaseId, chargeType])
  @@index([leaseId])
}

model Disbursement {
  id               String             @id @default(uuid())
  leaseId          String
  amount           Decimal            @db.Decimal(18, 2)
  method           DisbursementMethod
  status           DisbursementStatus
  reference        String?
  recordedByUserId String
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  lease          Lease @relation(fields: [leaseId], references: [id], onDelete: Restrict)
  recordedByUser User  @relation("DisbursementRecordedBy", fields: [recordedByUserId], references: [id], onDelete: Restrict)

  @@index([leaseId])
  @@index([recordedByUserId])
}

model CompanyMaintenanceDeduction {
  id               String   @id @default(uuid())
  leaseId          String
  workOrderId      String
  amount           Decimal  @db.Decimal(18, 2)
  deductionMonth   DateTime
  recordedByUserId String
  createdAt        DateTime @default(now())

  lease          Lease     @relation(fields: [leaseId], references: [id], onDelete: Restrict)
  workOrder      WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Restrict)
  recordedByUser User      @relation("DeductionRecordedBy", fields: [recordedByUserId], references: [id], onDelete: Restrict)

  @@index([leaseId])
  @@index([workOrderId])
  @@index([recordedByUserId])
}

model LeaseAccountingConfig {
  id                     String   @id @default(uuid())
  leaseId                String   @unique
  tenantGracePeriodDays  Int      @default(0)
  companyGracePeriodDays Int      @default(0)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  lease Lease @relation(fields: [leaseId], references: [id], onDelete: Restrict)
}

`;

content = content.substring(0, doubleEntryStart) + newAccountingModels + content.substring(nextSection);
fs.writeFileSync(path, content);
