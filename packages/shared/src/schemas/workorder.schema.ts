import { z } from 'zod';
import { workOrderStatuses } from '../enums';

export const workOrderSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  status: z.enum(workOrderStatuses),
  customerName: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  accessNotes: z.string().nullable().optional(),
  hmsNotes: z.string().nullable().optional(),
  departmentId: z.string().uuid().nullable(),
  locationId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  planningOwnerUserId: z.string().uuid().nullable(),
  department: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
    })
    .nullable()
    .optional(),
  location: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
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
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createWorkOrderSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(workOrderStatuses).optional(),
  customerName: z.string().trim().min(1).max(200).optional(),
  contactName: z.string().trim().min(1).max(200).optional(),
  contactPhone: z.string().trim().min(1).max(100).optional(),
  addressLine1: z.string().trim().min(1).max(300).optional(),
  postalCode: z.string().trim().min(1).max(50).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  accessNotes: z.string().trim().min(1).max(2000).optional(),
  hmsNotes: z.string().trim().min(1).max(2000).optional(),
  departmentId: z.string().min(1).nullable().optional(),
  locationId: z.string().min(1).nullable().optional(),
  projectId: z.string().min(1).nullable().optional(),
  planningOwnerUserId: z.string().min(1).nullable().optional(),
});

export const updateWorkOrderSchema = createWorkOrderSchema.partial().extend({
  status: z.enum(workOrderStatuses).optional(),
});

export const assignWorkOrderSchema = z
  .object({
    assigneeUserId: z.string().min(1).optional(),
    assigneeTeamId: z.string().min(1).optional(),
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

export const addWorkOrderConsumableSchema = z.object({
  equipmentItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
  note: z.string().trim().min(1).max(500).optional(),
});

export const workOrderConsumableSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  equipmentItemId: z.string().uuid(),
  quantity: z.number().int().min(1),
  note: z.string().nullable(),
  createdAt: z.string(),
  equipmentItem: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
      serialNumber: z.string().nullable(),
      barcode: z.string().nullable(),
      type: z.literal('CONSUMABLE'),
    })
    .optional(),
});

export type WorkOrder = z.infer<typeof workOrderSchema>;
