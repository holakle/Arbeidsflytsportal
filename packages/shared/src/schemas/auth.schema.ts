import { z } from 'zod';
import { roleCodes } from '../enums';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  organizationId: z.string().uuid(),
});

export const meResponseSchema = z.object({
  user: userSchema,
  roles: z.array(z.enum(roleCodes)),
  organizationId: z.string().uuid(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

