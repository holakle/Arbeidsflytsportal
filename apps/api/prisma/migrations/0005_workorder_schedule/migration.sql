ALTER TABLE "WorkOrder"
ADD COLUMN "planningOwnerUserId" TEXT;

ALTER TABLE "WorkOrder"
ADD CONSTRAINT "WorkOrder_planningOwnerUserId_fkey"
FOREIGN KEY ("planningOwnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "WorkOrderSchedule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "assigneeUserId" TEXT,
  "assigneeTeamId" TEXT,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkOrderSchedule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkOrderSchedule"
ADD CONSTRAINT "WorkOrderSchedule_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkOrderSchedule"
ADD CONSTRAINT "WorkOrderSchedule_workOrderId_fkey"
FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkOrderSchedule"
ADD CONSTRAINT "WorkOrderSchedule_assigneeUserId_fkey"
FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkOrderSchedule"
ADD CONSTRAINT "WorkOrderSchedule_assigneeTeamId_fkey"
FOREIGN KEY ("assigneeTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "WorkOrderSchedule_organizationId_assigneeUserId_startAt_idx" ON "WorkOrderSchedule"("organizationId", "assigneeUserId", "startAt");
CREATE INDEX "WorkOrderSchedule_organizationId_assigneeTeamId_startAt_idx" ON "WorkOrderSchedule"("organizationId", "assigneeTeamId", "startAt");
CREATE INDEX "WorkOrderSchedule_organizationId_workOrderId_startAt_idx" ON "WorkOrderSchedule"("organizationId", "workOrderId", "startAt");
