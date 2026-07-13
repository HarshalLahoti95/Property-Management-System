/*
  Warnings:

  - Added the required column `landlordSharePercentageSnapshot` to the `RentCharge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RentCharge" ADD COLUMN     "landlordSharePercentageSnapshot" DECIMAL(5,2) NOT NULL;
