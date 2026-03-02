import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  addWorkOrderConsumableSchema,
  assignWorkOrderSchema,
  createWorkOrderScheduleSchema,
  createWorkOrderSchema,
  setPlanningOwnerSchema,
  updateWorkOrderSchema,
  workOrderListQuerySchema,
} from '@portal/shared';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { TenantGuard } from '../../common/auth/guards/tenant.guard.js';
import type { AuthUser } from '../../common/auth/types.js';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import { WorkOrdersService } from './workorders.service.js';

@Controller('workorders')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class WorkOrdersController {
  constructor(@Inject(WorkOrdersService) private readonly service: WorkOrdersService) {}

  @Get()
  @Roles('planner', 'technician', 'org_admin')
  async list(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    const parsed = workOrderListQuerySchema.parse(query);
    return this.service.list(user.organizationId, user.id, parsed);
  }

  @Post()
  @Roles('planner', 'org_admin')
  @UsePipes(new ZodValidationPipe(createWorkOrderSchema))
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.service.create(user.organizationId, user.id, body);
  }

  @Get(':id')
  @Roles('planner', 'technician', 'org_admin')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.get(user.organizationId, id);
  }

  @Patch(':id')
  @Roles('planner', 'technician', 'org_admin')
  @UsePipes(new ZodValidationPipe(updateWorkOrderSchema))
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.update(user.organizationId, user.id, id, body);
  }

  @Delete(':id')
  @Roles('planner', 'org_admin')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.organizationId, id);
  }

  @Post(':id/assign')
  @Roles('planner', 'org_admin')
  @UsePipes(new ZodValidationPipe(assignWorkOrderSchema))
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { assigneeUserId?: string; assigneeTeamId?: string },
  ) {
    return this.service.assign(user.organizationId, user.id, id, body);
  }

  @Get(':id/consumables')
  @Roles('planner', 'technician', 'org_admin')
  listConsumables(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listConsumables(user.organizationId, id);
  }

  @Post(':id/consumables')
  @Roles('planner', 'technician', 'org_admin')
  @UsePipes(new ZodValidationPipe(addWorkOrderConsumableSchema))
  addConsumable(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { equipmentItemId: string; quantity?: number; note?: string },
  ) {
    return this.service.addConsumable(user.organizationId, user.id, id, body);
  }

  @Get(':id/schedule')
  @Roles('planner', 'technician', 'org_admin', 'member')
  listSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listScheduleForWorkOrder(user.organizationId, user.id, user.roles, id);
  }

  @Post(':id/planning-owner')
  @Roles('planner', 'org_admin')
  @UsePipes(new ZodValidationPipe(setPlanningOwnerSchema))
  setPlanningOwner(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { planningOwnerUserId: string | null },
  ) {
    return this.service.setPlanningOwner(user.organizationId, user.id, id, body.planningOwnerUserId);
  }

  @Post(':id/schedule')
  @Roles('planner', 'org_admin')
  @UsePipes(new ZodValidationPipe(createWorkOrderScheduleSchema))
  createSchedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { assigneeUserId?: string; assigneeTeamId?: string; startAt: string; endAt: string; note?: string; status?: string },
  ) {
    return this.service.createSchedule(user.organizationId, user.id, id, body);
  }

  @Delete(':id/schedule/:scheduleId')
  @Roles('planner', 'org_admin')
  removeSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('scheduleId') scheduleId: string) {
    return this.service.deleteSchedule(user.organizationId, user.id, id, scheduleId);
  }
}
