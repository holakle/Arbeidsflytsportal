import { z } from 'zod';
import { workOrderStatuses } from '../enums';

export const workOrderSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  status: z.enum(workOrderStatuses),
  departmentId: z.string().uuid().nullable(),
  locationId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createWorkOrderSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export const updateWorkOrderSchema = createWorkOrderSchema.partial().extend({
  status: z.enum(workOrderStatuses).optional(),
});

export const assignWorkOrderSchema = z
  .object({
    assigneeUserId: z.string().uuid().optional(),
    assigneeTeamId: z.string().uuid().optional(),
  })
  .refine((v) => Boolean(v.assigneeUserId) !== Boolean(v.assigneeTeamId), {
    message: 'Exactly one of assigneeUserId or assigneeTeamId is required',
  });

export const workOrderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(workOrderStatuses).optional(),
  assignedToMe: z.coerce.boolean().optional(),
});

export type WorkOrder = z.infer<typeof workOrderSchema>;

