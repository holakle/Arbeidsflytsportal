import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { scheduleQuerySchema } from '@portal/shared';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { TenantGuard } from '../../common/auth/guards/tenant.guard.js';
import type { AuthUser } from '../../common/auth/types.js';
import { ScheduleService } from './schedule.service.js';

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
}
