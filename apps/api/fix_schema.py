import re

with open('prisma/pulled.prisma', 'r') as f:
    content = f.read()

# 1. Enums
content = re.sub(r'enum PaymentStatus \{[\s\S]*?\}', lambda m: m.group(0) + '\n\nenum DisbursementMethod {\n  MANUAL\n  STRIPE\n  RAZORPAY\n}\n\nenum DisbursementStatus {\n  PENDING\n  PAID\n  FAILED\n}', content)

# 2. User Back-Relations
content = re.sub(r'(leaseStatusHistories\s+LeaseStatusHistory\[\]\s+@relation\("UserLeaseStatusHistory"\))', r'\1\n  disbursementsRecorded Disbursement[]           @relation("DisbursementRecordedBy")\n  percentageHistoriesChanged LeaseSharePercentageHistory[] @relation("PercentageHistoryChangedBy")\n  companyDeductionsRecorded CompanyMaintenanceDeduction[] @relation("DeductionRecordedBy")', content)

# 3. Lease Back-Relations
content = re.sub(r'(leaseStatusHistories\s+LeaseStatusHistory\[\]\s+@relation\("LeaseStatusHistoryTrack"\))', r'\1\n  rentCharges          RentCharge[]\n  payments             Payment[]\n  sharePercentageHistories LeaseSharePercentageHistory[]\n  chargeSplitRules     ChargeSplitRule[]\n  disbursements        Disbursement[]\n  companyMaintenanceDeductions CompanyMaintenanceDeduction[]\n  accountingConfig     LeaseAccountingConfig?', content)

# 4. WorkOrder Back-Relations
content = re.sub(r'(statusHistory\s+WorkOrderStatusHistory\[\])', r'\1\n  companyMaintenanceDeductions CompanyMaintenanceDeduction[]', content)

# 5. Remove PaymentDocument from Document
content = re.sub(r'\s*paymentDocuments\s+PaymentDocument\[\]\n', '\n', content)

# 6. Remove PaymentDocument Model completely
content = re.sub(r'model PaymentDocument \{[\s\S]*?\}\n', '', content)

# 7. Remove LedgerBalanceHistory Model completely
content = re.sub(r'model LedgerBalanceHistory \{[\s\S]*?\}\n', '', content)

# 8. Replace Double Entry Block
# Find the start of FinancialLedger model and the end of PaymentAllocation model
ledger_match = re.search(r'/// BUSINESS CONSTRAINT:\s*/// - Enforced in PostgreSQL Migration: Composite Unique Constraint @@unique\(\[leaseId, ledgerType\]\)[\s\S]*?model PaymentAllocation \{[\s\S]*?\}\n', content)

new_accounting_models = """// ==========================================
// DOUBLE ENTRY TRUST LEDGER SYSTEM (REBUILT)
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
"""

if ledger_match:
    content = content[:ledger_match.start()] + new_accounting_models + content[ledger_match.end():]
else:
    print("Could not find accounting block")

with open('prisma/schema.prisma', 'w') as f:
    f.write(content)

