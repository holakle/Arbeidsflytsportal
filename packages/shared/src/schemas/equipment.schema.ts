import { z } from 'zod';

export const equipmentItemSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  serialNumber: z.string().nullable(),
  active: z.boolean(),
});

export const reserveEquipmentSchema = z.object({
  equipmentItemId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export const equipmentReservationSchema = z.object({
  id: z.string().uuid(),
  equipmentItemId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  startAt: z.string(),
  endAt: z.string(),
  equipmentItem: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
      serialNumber: z.string().nullable(),
    })
    .optional(),
  workOrder: z
    .object({
      id: z.string().uuid(),
      title: z.string().min(1),
      status: z.string(),
    })
    .optional(),
});
