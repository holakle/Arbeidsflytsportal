import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { scheduleQuerySchema } from '@portal/shared';
import { z } from 'zod';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { TenantGuard } from '../../common/auth/guards/tenant.guard.js';
import type { AuthUser } from '../../common/auth/types.js';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import { ScheduleService } from './schedule.service.js';

const createScheduleSchema = z
  .object({
    workOrderId: z.string().min(1),
    assigneeUserId: z.string().min(1).optional(),
    assigneeTeamId: z.string().min(1).optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    note: z.string().trim().min(1).max(500).optional(),
    status: z.string().trim().min(1).max(50).optional(),
    allowConflict: z.boolean().optional(),
  })
  .refine((v) => Boolean(v.assigneeUserId) !== Boolean(v.assigneeTeamId), {
    message: 'Exactly one of assigneeUserId or assigneeTeamId is required',
  });

const updateScheduleSchema = z
  .object({
    workOrderId: z.string().min(1).optional(),
    assigneeUserId: z.string().min(1).optional(),
    assigneeTeamId: z.string().min(1).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    note: z.string().trim().min(1).max(500).optional(),
    status: z.string().trim().min(1).max(50).optional(),
    allowConflict: z.boolean().optional(),
  })
  .refine(
    (v) => {
      if ((v.assigneeUserId && v.assigneeTeamId) || (!v.assigneeUserId && !v.assigneeTeamId)) {
        return v.assigneeUserId === undefined && v.assigneeTeamId === undefined;
      }
      return true;
    },
    {
      message: 'Exactly one of assigneeUserId or assigneeTeamId is required when assignee is set',
    },
  )
  .refine((v) => !(v.startAt && v.endAt) || new Date(v.startAt) < new Date(v.endAt), {
    message: 'startAt must be before endAt',
  });

@Controller('schedule')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ScheduleController {
  constructor(@Inject(ScheduleService) private readonly service: ScheduleService) {}

  @Get()
  @Roles('planner', 'technician', 'org_admin', 'member')
  list(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    const parsed = scheduleQuerySchema.parse(query);
    return this.service.list(user.organizationId, user.id, user.roles, parsed);
  }

  @Post()
  @Roles('planner', 'org_admin')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createScheduleSchema))
    body: {
      workOrderId: string;
      assigneeUserId?: string;
      assigneeTeamId?: string;
      startAt: string;
      endAt: string;
      note?: string;
      status?: string;
      allowConflict?: boolean;
    },
  ) {
    return this.service.create(user.organizationId, user.id, body);
  }

  @Patch(':id')
  @Roles('planner', 'org_admin')
  patch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateScheduleSchema)) body: Record<string, unknown>,
  ) {
    return this.service.patch(user.organizationId, user.id, id, body);
  }
}
