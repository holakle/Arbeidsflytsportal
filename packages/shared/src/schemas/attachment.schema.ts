import { z } from 'zod';
import { attachmentKinds } from '../enums';

export const attachmentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  uploadedByUserId: z.string().uuid(),
  kind: z.enum(attachmentKinds),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  storageKey: z.string().min(1),
  url: z.string().nullable().optional(),
  createdAt: z.string(),
});
