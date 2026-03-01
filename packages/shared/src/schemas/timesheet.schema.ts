import { z } from 'zod';
import { activityTypes } from '../enums';

export const timesheetEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  date: z.string(),
  hours: z.number().positive().max(24),
  activityType: z.enum(activityTypes),
  workOrderId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  note: z.string().nullable(),
});

export const createTimesheetSchema = z.object({
  date: z.string(),
  hours: z.number().positive().max(24),
  activityType: z.enum(activityTypes),
  workOrderId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  note: z.string().optional(),
});

export const updateTimesheetSchema = createTimesheetSchema.partial();

export const weeklySummarySchema = z.object({
  weekStart: z.string(),
  totalHours: z.number(),
  byActivityType: z.record(z.number()),
});

