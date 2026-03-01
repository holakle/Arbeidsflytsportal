import { z } from 'zod';
import { roleCodes } from '../enums';

export const devAuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  organizationId: z.string().uuid(),
  roles: z.array(z.enum(roleCodes)),
});

export const issueDevTokenSchema = z.object({
  userId: z.string().uuid(),
});

export const issueDevTokenResponseSchema = z.object({
  token: z.string().min(1),
  user: devAuthUserSchema,
});

export type DevAuthUser = z.infer<typeof devAuthUserSchema>;
export type IssueDevTokenRequest = z.infer<typeof issueDevTokenSchema>;
export type IssueDevTokenResponse = z.infer<typeof issueDevTokenResponseSchema>;
