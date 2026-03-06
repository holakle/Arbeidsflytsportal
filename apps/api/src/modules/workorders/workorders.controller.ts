import {
  BadRequestException,
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
} from '@nestjs/common';
import {
  addWorkOrderConsumableSchema,
  assignWorkOrderSchema,
  createWorkOrderSubOrderSchema,
  createWorkOrderScheduleSchema,
  createWorkOrderSchema,
  setPlanningOwnerSchema,
  updateWorkOrderSubOrderSchema,
  updateWorkOrderSchema,
  workOrderListQuerySchema,
} from '@portal/shared';
import { z } from 'zod';
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
  @Roles('planner', 'technician', 'org_admin', 'member')
  async list(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    const parsed = workOrderListQuerySchema.parse(query);
    return this.service.list(user.organizationId, user.id, parsed);
  }

  @Post()
  @Roles('planner', 'org_admin')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createWorkOrderSchema)) body: Record<string, unknown>,
  ) {
    return this.service.create(user.organizationId, user.id, body);
  }

  @Get(':id')
  @Roles('planner', 'technician', 'org_admin', 'member')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.get(user.organizationId, id);
  }

  @Patch(':id')
  @Roles('planner', 'technician', 'org_admin')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWorkOrderSchema)) body: Record<string, unknown>,
  ) {
    return this.service.update(user.organizationId, user.id, id, body);
  }

  @Delete(':id')
  @Roles('planner', 'org_admin')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.organizationId, id);
  }

  @Post(':id/assign')
  @Roles('planner', 'org_admin')
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignWorkOrderSchema))
    body: { assigneeUserId?: string; assigneeTeamId?: string },
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
  addConsumable(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addWorkOrderConsumableSchema))
    body: { equipmentItemId: string; quantity?: number; note?: string },
  ) {
    return this.service.addConsumable(user.organizationId, user.id, id, body);
  }

  @Get(':id/suborders')
  @Roles('planner', 'technician', 'org_admin', 'member')
  listSubOrders(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listSubOrders(user.organizationId, id);
  }

  @Post(':id/suborders')
  @Roles('planner', 'technician', 'org_admin')
  createSubOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createWorkOrderSubOrderSchema))
    body: { title: string; timesheetCode?: string; description?: string; status?: string },
  ) {
    return this.service.createSubOrder(user.organizationId, user.id, id, body);
  }

  @Get(':id/suborders/:subOrderId')
  @Roles('planner', 'technician', 'org_admin', 'member')
  getSubOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('subOrderId') subOrderId: string,
  ) {
    return this.service.getSubOrder(user.organizationId, id, subOrderId);
  }

  @Patch(':id/suborders/:subOrderId')
  @Roles('planner', 'technician', 'org_admin')
  updateSubOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('subOrderId') subOrderId: string,
    @Body(new ZodValidationPipe(updateWorkOrderSubOrderSchema))
    body: { title?: string; timesheetCode?: string; description?: string; status?: string },
  ) {
    return this.service.updateSubOrder(user.organizationId, user.id, id, subOrderId, body);
  }

  @Delete(':id/suborders/:subOrderId')
  @Roles('planner', 'technician', 'org_admin')
  deleteSubOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('subOrderId') subOrderId: string,
  ) {
    return this.service.deleteSubOrder(user.organizationId, user.id, id, subOrderId);
  }

  @Get(':id/schedule')
  @Roles('planner', 'technician', 'org_admin', 'member')
  listSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listScheduleForWorkOrder(user.organizationId, user.id, user.roles, id);
  }

  @Post(':id/planning-owner')
  @Roles('planner', 'org_admin')
  setPlanningOwner(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setPlanningOwnerSchema))
    body: { planningOwnerUserId: string | null },
  ) {
    return this.service.setPlanningOwner(
      user.organizationId,
      user.id,
      id,
      body.planningOwnerUserId,
    );
  }

  @Post(':id/schedule')
  @Roles('planner', 'org_admin')
  createSchedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createWorkOrderScheduleSchema))
    body: {
      assigneeUserId?: string;
      assigneeTeamId?: string;
      startAt: string;
      endAt: string;
      note?: string;
      status?: string;
      allowConflict?: boolean;
    },
  ) {
    return this.service.createSchedule(user.organizationId, user.id, id, body);
  }

  @Post(':id/start')
  @Roles('planner', 'technician', 'org_admin', 'member')
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.startSession(user.organizationId, user.id, id);
  }

  @Post(':id/pause')
  @Roles('planner', 'technician', 'org_admin', 'member')
  pause(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.pauseSession(user.organizationId, user.id, id);
  }

  @Post(':id/finish')
  @Roles('planner', 'technician', 'org_admin', 'member')
  finish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.finishSession(user.organizationId, user.id, id);
  }

  @Get(':id/attachments')
  @Roles('planner', 'technician', 'org_admin', 'member')
  listAttachments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listAttachments(user.organizationId, id);
  }

  @Post(':id/attachments')
  @Roles('planner', 'technician', 'org_admin', 'member')
  addAttachment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      fileName: string;
      mimeType: string;
      contentBase64: string;
      kind?: 'BEFORE' | 'AFTER' | 'GENERAL' | 'DEVIATION' | 'SIGNATURE';
    },
  ) {
    const parsed = z
      .object({
        fileName: z.string().min(1),
        mimeType: z.string().min(1),
        contentBase64: z.string().min(1),
        kind: z.enum(['BEFORE', 'AFTER', 'GENERAL', 'DEVIATION', 'SIGNATURE']).optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.service.addAttachment(user.organizationId, user.id, id, parsed.data);
  }

  @Delete(':id/schedule/:scheduleId')
  @Roles('planner', 'org_admin')
  removeSchedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.service.deleteSchedule(user.organizationId, user.id, id, scheduleId);
  }
}
