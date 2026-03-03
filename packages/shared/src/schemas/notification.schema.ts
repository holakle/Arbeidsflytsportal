import { z } from 'zod';
import { notificationTypes } from '../enums';

export const notificationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(notificationTypes),
  payload: z.record(z.unknown()),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
