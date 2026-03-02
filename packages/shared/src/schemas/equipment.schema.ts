import { z } from 'zod';
import { equipmentItemTypes } from '../enums';

export const equipmentItemSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  serialNumber: z.string().nullable(),
  barcode: z.string().nullable(),
  type: z.enum(equipmentItemTypes),
  active: z.boolean(),
});

export const reserveEquipmentSchema = z.object({
  equipmentItemId: z.string().min(1),
  workOrderId: z.string().min(1),
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
      barcode: z.string().nullable().optional(),
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

export const attachBarcodeRequestSchema = z.object({
  barcode: z.string().min(1),
});

export const attachBarcodeResponseSchema = z.object({
  item: equipmentItemSchema,
});

export const equipmentLookupResponseSchema = z.object({
  code: z.string(),
  found: z.boolean(),
  item: equipmentItemSchema.nullable(),
  status: z.enum(['AVAILABLE', 'RESERVED_ACTIVE', 'CONSUMABLE', 'NOT_FOUND']),
  activeReservation: equipmentReservationSchema.nullable(),
});
