-- Create enum for equipment item classification
CREATE TYPE "EquipmentItemType" AS ENUM ('EQUIPMENT', 'CONSUMABLE');

-- Add type field to equipment items
ALTER TABLE "EquipmentItem"
ADD COLUMN "type" "EquipmentItemType" NOT NULL DEFAULT 'EQUIPMENT';

-- Create table for manually registered consumables on work orders
CREATE TABLE "WorkOrderConsumable" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "equipmentItemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkOrderConsumable_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkOrderConsumable_workOrderId_createdAt_idx" ON "WorkOrderConsumable"("workOrderId", "createdAt");
CREATE INDEX "WorkOrderConsumable_equipmentItemId_idx" ON "WorkOrderConsumable"("equipmentItemId");

ALTER TABLE "WorkOrderConsumable"
ADD CONSTRAINT "WorkOrderConsumable_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkOrderConsumable"
ADD CONSTRAINT "WorkOrderConsumable_workOrderId_fkey"
FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkOrderConsumable"
ADD CONSTRAINT "WorkOrderConsumable_equipmentItemId_fkey"
FOREIGN KEY ("equipmentItemId") REFERENCES "EquipmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
