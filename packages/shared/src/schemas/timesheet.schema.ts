import { z } from 'zod';
import { activityTypes, timesheetStatuses } from '../enums';

export const timesheetEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  date: z.string(),
  hours: z.number().positive().max(24),
  activityType: z.enum(activityTypes),
  workOrderId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  workOrder: z
    .object({
      id: z.string().uuid(),
      title: z.string().min(1),
    })
    .nullable()
    .optional(),
  project: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
    })
    .nullable()
    .optional(),
  note: z.string().nullable(),
  status: z.enum(timesheetStatuses).optional(),
});

export const createTimesheetSchema = z.object({
  date: z.string(),
  hours: z.number().positive().max(24),
  activityType: z.enum(activityTypes),
  userId: z.string().min(1).nullable().optional(),
  workOrderId: z.string().min(1).nullable().optional(),
  projectId: z.string().min(1).nullable().optional(),
  note: z.string().optional(),
  status: z.enum(timesheetStatuses).optional(),
});

export const updateTimesheetSchema = createTimesheetSchema.partial();

export const weeklySummarySchema = z.object({
  weekStart: z.string(),
  totalHours: z.number(),
  byActivityType: z.record(z.number()),
});
