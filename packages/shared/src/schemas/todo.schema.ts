import { z } from 'zod';
import { todoStatuses } from '../enums';

export const todoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  teamId: z.string().uuid().nullable(),
  title: z.string().min(1),
  status: z.enum(todoStatuses),
  dueDate: z.string().nullable(),
  description: z.string().nullable(),
});

export const createTodoSchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  status: z.enum(todoStatuses).default('OPEN'),
  dueDate: z.string().nullable().optional(),
  description: z.string().optional(),
});

export const updateTodoSchema = createTodoSchema.partial();
