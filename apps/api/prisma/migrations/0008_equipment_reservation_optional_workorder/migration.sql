-- Allow field booking of equipment without linking to a work order.
ALTER TABLE "EquipmentReservation"
  ALTER COLUMN "workOrderId" DROP NOT NULL;

ALTER TABLE "EquipmentReservation" DROP CONSTRAINT IF EXISTS "EquipmentReservation_workOrderId_fkey";

ALTER TABLE "EquipmentReservation"
  ADD CONSTRAINT "EquipmentReservation_workOrderId_fkey"
  FOREIGN KEY ("workOrderId")
  REFERENCES "WorkOrder"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
