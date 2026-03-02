import { z } from 'zod';

export const scheduleQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  scope: z.enum(['mine', 'all']).optional(),
  assigneeUserId: z.string().min(1).optional(),
  assigneeTeamId: z.string().min(1).optional(),
  equipmentItemId: z.string().min(1).optional(),
});

export const setPlanningOwnerSchema = z.object({
  planningOwnerUserId: z.string().min(1).nullable(),
});

export const createWorkOrderScheduleSchema = z
  .object({
    assigneeUserId: z.string().min(1).optional(),
    assigneeTeamId: z.string().min(1).optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    note: z.string().trim().min(1).max(500).optional(),
    status: z.string().trim().min(1).max(50).optional(),
  })
  .refine((v) => Boolean(v.assigneeUserId) !== Boolean(v.assigneeTeamId), {
    message: 'Exactly one of assigneeUserId or assigneeTeamId is required',
  });

export const scheduleEventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['workorder_schedule', 'equipment_reservation']),
  title: z.string().min(1),
  start: z.string(),
  end: z.string(),
  status: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  resourceRef: z
    .object({
      kind: z.enum(['user', 'team', 'equipment']),
      id: z.string().uuid(),
      label: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  workOrderRef: z
    .object({
      id: z.string().uuid(),
      title: z.string().min(1),
      status: z.string(),
    })
    .nullable()
    .optional(),
});

export const workOrderScheduleSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  assigneeUserId: z.string().uuid().nullable(),
  assigneeTeamId: z.string().uuid().nullable(),
  startAt: z.string(),
  endAt: z.string(),
  note: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
});
