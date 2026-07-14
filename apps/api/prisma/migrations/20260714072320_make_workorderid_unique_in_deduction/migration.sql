/*
  Warnings:

  - A unique constraint covering the columns `[workOrderId]` on the table `CompanyMaintenanceDeduction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CompanyMaintenanceDeduction_workOrderId_key" ON "CompanyMaintenanceDeduction"("workOrderId");
