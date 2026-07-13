-- Explicitly truncate legacy accounting data before schema modification 
-- since these modules are being rebuilt from scratch.
TRUNCATE TABLE "PaymentAllocation", "Payment", "RentCharge", "LedgerBalanceHistory", "FinancialLedger" CASCADE;

-- CreateEnum
CREATE TYPE "DisbursementMethod" AS ENUM ('MANUAL', 'STRIPE', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- DropForeignKey
ALTER TABLE "PaymentDocument" DROP CONSTRAINT "PaymentDocument_documentId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentDocument" DROP CONSTRAINT "PaymentDocument_paymentId_fkey";

-- DropIndex
DROP INDEX "RentCharge_ledgerId_status_idx";

-- AlterTable
ALTER TABLE "RentCharge" ADD COLUMN     "billingMonth" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "leaseId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "billingMonth" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "leaseId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PaymentAllocation" DROP COLUMN "amountAllocated",
ADD COLUMN     "companyShareAmount" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "landlordShareAmount" DECIMAL(18,2) NOT NULL;

-- DropTable
DROP TABLE "PaymentDocument";

-- CreateTable
CREATE TABLE "LeaseSharePercentageHistory" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "landlordSharePercentage" DECIMAL(5,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaseSharePercentageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargeSplitRule" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "chargeType" "ChargeType" NOT NULL,
    "landlordSharePercentage" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargeSplitRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disbursement" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "method" "DisbursementMethod" NOT NULL,
    "status" "DisbursementStatus" NOT NULL,
    "reference" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMaintenanceDeduction" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "deductionMonth" TIMESTAMP(3) NOT NULL,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMaintenanceDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseAccountingConfig" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "tenantGracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "companyGracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseAccountingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaseSharePercentageHistory_leaseId_idx" ON "LeaseSharePercentageHistory"("leaseId");

-- CreateIndex
CREATE INDEX "LeaseSharePercentageHistory_changedByUserId_idx" ON "LeaseSharePercentageHistory"("changedByUserId");

-- CreateIndex
CREATE INDEX "LeaseSharePercentageHistory_effectiveFrom_idx" ON "LeaseSharePercentageHistory"("effectiveFrom");

-- CreateIndex
CREATE INDEX "ChargeSplitRule_leaseId_idx" ON "ChargeSplitRule"("leaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ChargeSplitRule_leaseId_chargeType_key" ON "ChargeSplitRule"("leaseId", "chargeType");

-- CreateIndex
CREATE INDEX "Disbursement_leaseId_idx" ON "Disbursement"("leaseId");

-- CreateIndex
CREATE INDEX "Disbursement_recordedByUserId_idx" ON "Disbursement"("recordedByUserId");

-- CreateIndex
CREATE INDEX "CompanyMaintenanceDeduction_leaseId_idx" ON "CompanyMaintenanceDeduction"("leaseId");

-- CreateIndex
CREATE INDEX "CompanyMaintenanceDeduction_workOrderId_idx" ON "CompanyMaintenanceDeduction"("workOrderId");

-- CreateIndex
CREATE INDEX "CompanyMaintenanceDeduction_recordedByUserId_idx" ON "CompanyMaintenanceDeduction"("recordedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaseAccountingConfig_leaseId_key" ON "LeaseAccountingConfig"("leaseId");

-- CreateIndex
CREATE INDEX "RentCharge_leaseId_status_idx" ON "RentCharge"("leaseId", "status");

-- CreateIndex
CREATE INDEX "RentCharge_billingMonth_idx" ON "RentCharge"("billingMonth");

-- CreateIndex
CREATE INDEX "Payment_leaseId_idx" ON "Payment"("leaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_leaseId_billingMonth_key" ON "Payment"("leaseId", "billingMonth");

-- AddForeignKey
ALTER TABLE "RentCharge" ADD CONSTRAINT "RentCharge_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseSharePercentageHistory" ADD CONSTRAINT "LeaseSharePercentageHistory_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseSharePercentageHistory" ADD CONSTRAINT "LeaseSharePercentageHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeSplitRule" ADD CONSTRAINT "ChargeSplitRule_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMaintenanceDeduction" ADD CONSTRAINT "CompanyMaintenanceDeduction_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMaintenanceDeduction" ADD CONSTRAINT "CompanyMaintenanceDeduction_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMaintenanceDeduction" ADD CONSTRAINT "CompanyMaintenanceDeduction_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseAccountingConfig" ADD CONSTRAINT "LeaseAccountingConfig_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

