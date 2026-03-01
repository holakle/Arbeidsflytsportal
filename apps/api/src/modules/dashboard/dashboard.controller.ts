import { Body, Controller, Get, Inject, Put, UseGuards, UsePipes } from '@nestjs/common';
import { updateDashboardSchema } from '@portal/shared';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { TenantGuard } from '../../common/auth/guards/tenant.guard.js';
import type { AuthUser } from '../../common/auth/types.js';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly service: DashboardService) {}

  @Get()
  @Roles('planner', 'technician', 'member', 'org_admin')
  get(@CurrentUser() user: AuthUser) {
    return this.service.getOrCreate(user.organizationId, user.id);
  }

  @Put()
  @Roles('planner', 'technician', 'member', 'org_admin')
  @UsePipes(new ZodValidationPipe(updateDashboardSchema))
  update(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.update(user.organizationId, user.id, body);
  }
}

