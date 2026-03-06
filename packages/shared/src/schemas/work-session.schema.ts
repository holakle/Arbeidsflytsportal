import { z } from 'zod';
import { workSessionStates } from '../enums';

export const workSessionSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  userId: z.string().uuid(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  state: z.enum(workSessionStates),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workSessionActionResponseSchema = z.object({
  session: workSessionSchema,
  timesheetDraftId: z.string().uuid().nullable().optional(),
  timesheetDraftHours: z.number().nonnegative().optional(),
});
