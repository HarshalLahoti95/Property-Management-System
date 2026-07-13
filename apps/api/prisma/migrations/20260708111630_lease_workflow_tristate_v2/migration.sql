-- CreateEnum
CREATE TYPE "LeaseRenewalType" AS ENUM ('AUTO_MONTH_TO_MONTH', 'FIXED_END');

-- CreateEnum
CREATE TYPE "LeaseDocumentPurpose" AS ENUM ('DRAFT_PREVIEW', 'TENANT_SIGNATURE_COPY', 'EXECUTED');

-- AlterEnum
ALTER TYPE "LeaseStatus" ADD VALUE 'REJECTED';
ALTER TYPE "LeaseStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "LeaseStatus" ADD VALUE 'DECLINED';

-- AlterEnum
ALTER TYPE "LeaseTenantStatus" ADD VALUE 'PENDING';
ALTER TYPE "LeaseTenantStatus" ADD VALUE 'DECLINED';

-- AlterEnum
ALTER TYPE "UnitOccupancyStatus" ADD VALUE 'RESERVED';

-- AlterTable
ALTER TABLE "Lease" DROP COLUMN "generatedAt",
DROP COLUMN "generatedDocumentName",
DROP COLUMN "generatedDocumentUrl",
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "leaseTermsJson" JSONB,
ADD COLUMN     "renewalType" "LeaseRenewalType" NOT NULL DEFAULT 'FIXED_END';

-- AlterTable
ALTER TABLE "LeaseDocument" ADD COLUMN     "purpose" "LeaseDocumentPurpose" NOT NULL;

-- AlterTable
ALTER TABLE "LeaseStatusHistory" ALTER COLUMN "oldStatus" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LeaseTenant" ADD COLUMN     "declinedAt" TIMESTAMP(3),
ADD COLUMN     "signedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mailingAddress" TEXT;

-- CreateIndex
CREATE INDEX "Lease_createdByUserId_idx" ON "Lease"("createdByUserId");

-- CreateIndex
CREATE INDEX "LeaseDocument_leaseId_purpose_idx" ON "LeaseDocument"("leaseId", "purpose");

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
