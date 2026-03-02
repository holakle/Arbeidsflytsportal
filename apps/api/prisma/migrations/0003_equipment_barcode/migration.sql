ALTER TABLE "EquipmentItem"
ADD COLUMN "barcode" TEXT;

CREATE UNIQUE INDEX "EquipmentItem_organizationId_barcode_key"
ON "EquipmentItem"("organizationId", "barcode");
