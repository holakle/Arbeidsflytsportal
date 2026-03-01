import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { createTimesheetSchema, updateTimesheetSchema } from '@portal/shared';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { TenantGuard } from '../../common/auth/guards/tenant.guard.js';
import type { AuthUser } from '../../common/auth/types.js';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import { TimesheetsService } from './timesheets.service.js';

@Controller('timesheets')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class TimesheetsController {
  constructor(@Inject(TimesheetsService) private readonly service: TimesheetsService) {}

  @Get()
  @Roles('planner', 'technician', 'member', 'org_admin')
  list(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(user.organizationId, user.id, from, to);
  }

  @Post()
  @Roles('planner', 'technician', 'member', 'org_admin')
  @UsePipes(new ZodValidationPipe(createTimesheetSchema))
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.create(user.organizationId, user.id, body);
  }

  @Patch(':id')
  @Roles('planner', 'technician', 'member', 'org_admin')
  @UsePipes(new ZodValidationPipe(updateTimesheetSchema))
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.update(user.organizationId, user.id, id, body);
  }

  @Delete(':id')
  @Roles('planner', 'technician', 'member', 'org_admin')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.organizationId, user.id, id);
  }

  @Get('weekly-summary')
  @Roles('planner', 'technician', 'member', 'org_admin')
  weeklySummary(@CurrentUser() user: AuthUser, @Query('weekStart') weekStart?: string) {
    return this.service.weeklySummary(user.organizationId, user.id, weekStart);
  }
}

