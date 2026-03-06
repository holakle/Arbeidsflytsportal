ALTER TABLE "WorkOrder" ADD COLUMN "timesheetCode" TEXT;

UPDATE "WorkOrder"
SET "timesheetCode" = CONCAT('WO-', UPPER(SUBSTRING("id", 1, 8)))
WHERE "timesheetCode" IS NULL;

ALTER TABLE "WorkOrder" ALTER COLUMN "timesheetCode" SET NOT NULL;
CREATE UNIQUE INDEX "WorkOrder_organizationId_timesheetCode_key" ON "WorkOrder"("organizationId", "timesheetCode");

CREATE TABLE "WorkOrderSubOrder" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "timesheetCode" TEXT NOT NULL,
  "description" TEXT,
  "status" "WorkOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "WorkOrderSubOrder_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkOrderSubOrder"
ADD CONSTRAINT "WorkOrderSubOrder_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkOrderSubOrder"
ADD CONSTRAINT "WorkOrderSubOrder_workOrderId_fkey"
FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "WorkOrderSubOrder_organizationId_workOrderId_createdAt_idx"
ON "WorkOrderSubOrder"("organizationId", "workOrderId", "createdAt");

CREATE UNIQUE INDEX "WorkOrderSubOrder_organizationId_timesheetCode_key"
ON "WorkOrderSubOrder"("organizationId", "timesheetCode");

ALTER TABLE "TimesheetEntry" ADD COLUMN "subOrderId" TEXT;

ALTER TABLE "TimesheetEntry"
ADD CONSTRAINT "TimesheetEntry_subOrderId_fkey"
FOREIGN KEY ("subOrderId") REFERENCES "WorkOrderSubOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TimesheetEntry_subOrderId_idx" ON "TimesheetEntry"("subOrderId");
