const fs = require('fs');
const path = 'apps/api/prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// 1. Enums
content = content.replace(
  /enum PaymentStatus {[\s\S]*?}/,
  match => match + "\n\nenum DisbursementMethod {\n  MANUAL\n  STRIPE\n  RAZORPAY\n}\n\nenum DisbursementStatus {\n  PENDING\n  PAID\n  FAILED\n}"
);

// 2. User Back-Relations
content = content.replace(
  /payments\s+Payment\[\]\s+@relation\("TenantPayments"\)/,
  match => match + "\n  disbursementsRecorded Disbursement[] @relation(\"DisbursementRecordedBy\")\n  percentageHistoriesChanged LeaseSharePercentageHistory[] @relation(\"PercentageHistoryChangedBy\")\n  companyDeductionsRecorded CompanyMaintenanceDeduction[] @relation(\"DeductionRecordedBy\")"
);

// 3. Lease Back-Relations
content = content.replace(
  /leaseStatusHistories\s+LeaseStatusHistory\[\]\s+@relation\("LeaseStatusHistoryTrack"\)/,
  match => match + "\n  rentCharges          RentCharge[]\n  payments             Payment[]\n  sharePercentageHistories LeaseSharePercentageHistory[]\n  chargeSplitRules     ChargeSplitRule[]\n  disbursements        Disbursement[]\n  companyMaintenanceDeductions CompanyMaintenanceDeduction[]\n  accountingConfig     LeaseAccountingConfig?"
);

// 4. WorkOrder Back-Relations
content = content.replace(
  /statusHistory\s+WorkOrderStatusHistory\[\]/,
  match => match + "\n  companyMaintenanceDeductions CompanyMaintenanceDeduction[]"
);

// 5. Remove PaymentDocument from Document
content = content.replace(
  /paymentDocuments\s+PaymentDocument\[\]\n/,
  ""
);

// 6. Remove PaymentDocument Model
content = content.replace(
  /model PaymentDocument {[\s\S]*?}\n/,
  ""
);

// 7. Remove LedgerBalanceHistory Model
content = content.replace(
  /\/\/\/ oldStatus is nullable[\s\S]*?@@index\(\[ledgerId\]\)\n}/,
  match => match.split(/model LedgerBalanceHistory {/)[0]
);

// 8. Replace the entire Double Entry Ledger block
const doubleEntryStart = content.indexOf('// DOUBLE ENTRY TRUST LEDGER SYSTEM');
const nextSection = content.indexOf('// ==========================================\n// MAINTENANCE & VENDORS');

const newAccountingModels = `// DOUBLE ENTRY TRUST LEDGER SYSTEM (REBUILT)
// ==========================================

model FinancialLedger {
  id             String     @id @default(uuid())
  leaseId        String
  ledgerType     LedgerType
  runningBalance Decimal    @default(0.00) @db.Decimal(18, 2)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  lease Lease @relation(fields: [leaseId], references: [id], onDelete: Restrict)

  @@unique([leaseId, ledgerType])
  @@index([leaseId])
}

model RentCharge {
  id           String       @id @default(uuid())
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

  lease              Lease               @relation(fields: [leaseId], references: [id], onDelete: Restrict)
  paymentAllocations PaymentAllocation[]

  @@index([leaseId, status])
  @@index([billingMonth])
  @@index([dueDate])
}

model Payment {
  id                   String        @id @default(uuid())
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

  lease              Lease               @relation(fields: [leaseId], references: [id], onDelete: Restrict)
  tenant             User                @relation("TenantPayments", fields: [tenantId], references: [id], onDelete: Restrict)
  paymentAllocations PaymentAllocation[]

  @@unique([leaseId, billingMonth])
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
