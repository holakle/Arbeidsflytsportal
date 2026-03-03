CREATE TYPE "WorkOrderStatus" AS ENUM (
  'DRAFT',
  'READY_FOR_PLANNING',
  'PLANNED',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED'
);

CREATE TYPE "WorkSessionState" AS ENUM ('RUNNING', 'PAUSED', 'DONE');
CREATE TYPE "AttachmentKind" AS ENUM ('BEFORE', 'AFTER', 'GENERAL', 'DEVIATION', 'SIGNATURE');
CREATE TYPE "TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');
CREATE TYPE "NotificationType" AS ENUM (
  'WORKORDER_ASSIGNED',
  'SCHEDULE_CHANGED',
  'WORKORDER_BLOCKED',
  'WORKORDER_DONE'
);

ALTER TABLE "WorkOrder" ADD COLUMN "customerName" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "contactName" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "addressLine1" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "city" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "lat" DECIMAL(10,7);
ALTER TABLE "WorkOrder" ADD COLUMN "lng" DECIMAL(10,7);
ALTER TABLE "WorkOrder" ADD COLUMN "accessNotes" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "hmsNotes" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "status_v2" "WorkOrderStatus" NOT NULL DEFAULT 'READY_FOR_PLANNING';

UPDATE "WorkOrder"
SET "status_v2" = CASE "status"
  WHEN 'OPEN' THEN 'READY_FOR_PLANNING'::"WorkOrderStatus"
  WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'::"WorkOrderStatus"
  WHEN 'DONE' THEN 'DONE'::"WorkOrderStatus"
  WHEN 'BLOCKED' THEN 'BLOCKED'::"WorkOrderStatus"
  WHEN 'CANCELLED' THEN 'CANCELLED'::"WorkOrderStatus"
  WHEN 'PLANNED' THEN 'PLANNED'::"WorkOrderStatus"
  WHEN 'DRAFT' THEN 'DRAFT'::"WorkOrderStatus"
  ELSE 'READY_FOR_PLANNING'::"WorkOrderStatus"
END;

ALTER TABLE "WorkOrder" DROP COLUMN "status";
ALTER TABLE "WorkOrder" RENAME COLUMN "status_v2" TO "status";

ALTER TABLE "TimesheetEntry" ADD COLUMN "status" "TimesheetStatus" NOT NULL DEFAULT 'DRAFT';

CREATE TABLE "WorkSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "state" "WorkSessionState" NOT NULL DEFAULT 'RUNNING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkSession"
ADD CONSTRAINT "WorkSession_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkSession"
ADD CONSTRAINT "WorkSession_workOrderId_fkey"
FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkSession"
ADD CONSTRAINT "WorkSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "WorkSession_organizationId_userId_state_idx" ON "WorkSession"("organizationId", "userId", "state");
CREATE INDEX "WorkSession_organizationId_workOrderId_startedAt_idx" ON "WorkSession"("organizationId", "workOrderId", "startedAt");

CREATE TABLE "Attachment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "kind" "AttachmentKind" NOT NULL DEFAULT 'GENERAL',
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "url" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Attachment"
ADD CONSTRAINT "Attachment_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment"
ADD CONSTRAINT "Attachment_workOrderId_fkey"
FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment"
ADD CONSTRAINT "Attachment_uploadedByUserId_fkey"
FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Attachment_organizationId_workOrderId_createdAt_idx" ON "Attachment"("organizationId", "workOrderId", "createdAt");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "payload" JSONB NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Notification_organizationId_userId_createdAt_idx" ON "Notification"("organizationId", "userId", "createdAt");
CREATE INDEX "Notification_organizationId_userId_readAt_idx" ON "Notification"("organizationId", "userId", "readAt");
