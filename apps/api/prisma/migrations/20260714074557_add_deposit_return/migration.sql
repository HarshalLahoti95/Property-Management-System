-- AlterEnum
ALTER TYPE "LedgerTriggerEvent" ADD VALUE 'DEPOSIT_RETURN';

-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "actualEndDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SecurityDepositReturn" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "recordedByUserId" TEXT NOT NULL,
    "reference" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityDepositReturn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityDepositReturn_leaseId_idx" ON "SecurityDepositReturn"("leaseId");

-- CreateIndex
CREATE INDEX "SecurityDepositReturn_recordedByUserId_idx" ON "SecurityDepositReturn"("recordedByUserId");

-- AddForeignKey
ALTER TABLE "SecurityDepositReturn" ADD CONSTRAINT "SecurityDepositReturn_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityDepositReturn" ADD CONSTRAINT "SecurityDepositReturn_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
