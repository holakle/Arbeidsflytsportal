ALTER TABLE "Assignment"
ADD CONSTRAINT "assignment_assignee_xor"
CHECK (
  ("assigneeUserId" IS NOT NULL AND "assigneeTeamId" IS NULL)
  OR ("assigneeUserId" IS NULL AND "assigneeTeamId" IS NOT NULL)
);
