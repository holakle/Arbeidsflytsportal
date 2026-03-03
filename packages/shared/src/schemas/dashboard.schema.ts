import { z } from 'zod';
import { widgetTypes } from '../enums';

export const widgetInstanceSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(widgetTypes),
  title: z.string(),
  config: z.record(z.unknown()).default({}),
});

export const dashboardLayoutSchema = z.object({
  id: z.string().uuid(),
  columns: z.number().int().min(1).max(6),
  layout: z.array(
    z.object({
      widgetInstanceId: z.string().uuid(),
      x: z.number().int().min(0),
      y: z.number().int().min(0),
      w: z.number().int().min(1),
      h: z.number().int().min(1),
    }),
  ),
});

export const dashboardResponseSchema = z.object({
  widgets: z.array(widgetInstanceSchema),
  layout: dashboardLayoutSchema,
});

export const updateDashboardSchema = dashboardResponseSchema;
