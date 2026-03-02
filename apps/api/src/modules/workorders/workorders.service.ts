import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AuditService } from '../../common/audit/audit.service.js';

@Injectable()
export class WorkOrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, userId: string, query: { page: number; limit: number; status?: string; assignedToMe?: boolean }) {
    const where = {
      organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedToMe
        ? {
            assignments: {
              some: { OR: [{ assigneeUserId: userId }, { assigneeTeam: { memberships: { some: { userId } } } }] },
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { assignments: true },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { items, page: query.page, limit: query.limit, total };
  }

  create(organizationId: string, userId: string, body: Record<string, unknown>) {
    return this.prisma.workOrder.create({
      data: {
        organizationId,
        createdByUserId: userId,
        title: String(body.title),
        description: body.description ? String(body.description) : null,
        departmentId: (body.departmentId as string | undefined) ?? null,
        locationId: (body.locationId as string | undefined) ?? null,
        projectId: (body.projectId as string | undefined) ?? null,
        planningOwnerUserId: (body.planningOwnerUserId as string | undefined) ?? null,
      },
    });
  }

  async get(organizationId: string, id: string) {
    const wo = await this.prisma.workOrder.findFirst({ where: { id, organizationId, deletedAt: null }, include: { assignments: true } });
    if (!wo) throw new NotFoundException('WorkOrder not found');
    return wo;
  }

  async update(organizationId: string, userId: string, id: string, body: Record<string, unknown>) {
    const existing = await this.get(organizationId, id);
    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        title: body.title ? String(body.title) : undefined,
        description: body.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
        status: body.status ? String(body.status) : undefined,
        departmentId: body.departmentId !== undefined ? ((body.departmentId as string | null) ?? null) : undefined,
        locationId: body.locationId !== undefined ? ((body.locationId as string | null) ?? null) : undefined,
        projectId: body.projectId !== undefined ? ((body.projectId as string | null) ?? null) : undefined,
        planningOwnerUserId:
          body.planningOwnerUserId !== undefined ? ((body.planningOwnerUserId as string | null) ?? null) : undefined,
      },
    });

    if (existing.status !== updated.status) {
      await this.audit.log({
        organizationId,
        actorUserId: userId,
        action: 'workorder.status.changed',
        entityType: 'WorkOrder',
        entityId: id,
        before: { status: existing.status },
        after: { status: updated.status },
      });
    }

    return updated;
  }

  async remove(organizationId: string, id: string) {
    await this.get(organizationId, id);
    return this.prisma.workOrder.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async assign(organizationId: string, userId: string, id: string, payload: { assigneeUserId?: string; assigneeTeamId?: string }) {
    if (Boolean(payload.assigneeUserId) === Boolean(payload.assigneeTeamId)) {
      throw new BadRequestException('Exactly one assigneeUserId or assigneeTeamId is required');
    }

    await this.get(organizationId, id);

    await this.prisma.assignment.create({
      data: {
        workOrderId: id,
        assigneeUserId: payload.assigneeUserId ?? null,
        assigneeTeamId: payload.assigneeTeamId ?? null,
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: 'workorder.assigned',
      entityType: 'WorkOrder',
      entityId: id,
      after: payload,
    });

    return { success: true as const };
  }

  async listConsumables(organizationId: string, workOrderId: string) {
    await this.get(organizationId, workOrderId);
    return this.prisma.workOrderConsumable.findMany({
      where: { organizationId, workOrderId },
      orderBy: { createdAt: 'desc' },
      include: {
        equipmentItem: { select: { id: true, name: true, serialNumber: true, barcode: true, type: true } },
      },
    });
  }

  async addConsumable(
    organizationId: string,
    actorUserId: string,
    workOrderId: string,
    payload: { equipmentItemId: string; quantity?: number; note?: string },
  ) {
    await this.get(organizationId, workOrderId);
    const equipmentItem = await this.prisma.equipmentItem.findFirst({
      where: { id: payload.equipmentItemId, organizationId, active: true },
      select: { id: true, type: true },
    });
    if (!equipmentItem) {
      throw new NotFoundException('Equipment item not found');
    }
    if (equipmentItem.type !== 'CONSUMABLE') {
      throw new BadRequestException('Only consumables can be registered as work order consumption');
    }

    const record = await this.prisma.workOrderConsumable.create({
      data: {
        organizationId,
        workOrderId,
        equipmentItemId: payload.equipmentItemId,
        quantity: payload.quantity ?? 1,
        note: payload.note ?? null,
      },
      include: {
        equipmentItem: { select: { id: true, name: true, serialNumber: true, barcode: true, type: true } },
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: 'workorder.consumable_added',
      entityType: 'WorkOrder',
      entityId: workOrderId,
      after: {
        consumableId: record.id,
        equipmentItemId: payload.equipmentItemId,
        quantity: record.quantity,
      },
    });

    return record;
  }

  async setPlanningOwner(
    organizationId: string,
    actorUserId: string,
    workOrderId: string,
    planningOwnerUserId: string | null,
  ) {
    await this.get(organizationId, workOrderId);
    if (planningOwnerUserId) {
      const user = await this.prisma.user.findFirst({
        where: { id: planningOwnerUserId, organizationId },
        select: { id: true },
      });
      if (!user) {
        throw new NotFoundException('Planning owner user not found');
      }
    }

    const updated = await this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: { planningOwnerUserId },
    });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: 'workorder.planning_owner_set',
      entityType: 'WorkOrder',
      entityId: workOrderId,
      after: { planningOwnerUserId },
    });

    return updated;
  }

  async createSchedule(
    organizationId: string,
    actorUserId: string,
    workOrderId: string,
    payload: { assigneeUserId?: string; assigneeTeamId?: string; startAt: string; endAt: string; note?: string; status?: string },
  ) {
    await this.get(organizationId, workOrderId);

    if (payload.assigneeUserId) {
      const user = await this.prisma.user.findFirst({
        where: { id: payload.assigneeUserId, organizationId },
        select: { id: true },
      });
      if (!user) throw new NotFoundException('Assignee user not found');
    }
    if (payload.assigneeTeamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: payload.assigneeTeamId, organizationId },
        select: { id: true },
      });
      if (!team) throw new NotFoundException('Assignee team not found');
    }

    const record = await this.prisma.workOrderSchedule.create({
      data: {
        organizationId,
        workOrderId,
        assigneeUserId: payload.assigneeUserId ?? null,
        assigneeTeamId: payload.assigneeTeamId ?? null,
        startAt: new Date(payload.startAt),
        endAt: new Date(payload.endAt),
        note: payload.note ?? null,
        status: payload.status ?? 'PLANNED',
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: 'workorder.schedule_created',
      entityType: 'WorkOrderSchedule',
      entityId: record.id,
      after: payload,
    });

    return record;
  }

  async deleteSchedule(organizationId: string, actorUserId: string, workOrderId: string, scheduleId: string) {
    await this.get(organizationId, workOrderId);
    const schedule = await this.prisma.workOrderSchedule.findFirst({
      where: { id: scheduleId, organizationId, workOrderId },
      select: { id: true },
    });
    if (!schedule) throw new NotFoundException('Schedule entry not found');

    await this.prisma.workOrderSchedule.delete({ where: { id: scheduleId } });
    await this.audit.log({
      organizationId,
      actorUserId,
      action: 'workorder.schedule_deleted',
      entityType: 'WorkOrderSchedule',
      entityId: scheduleId,
    });
    return { success: true as const };
  }

  async listScheduleForWorkOrder(organizationId: string, userId: string, roles: string[], workOrderId: string) {
    await this.get(organizationId, workOrderId);
    const canSeeAll = this.canManagePlanning(roles);
    return this.prisma.workOrderSchedule.findMany({
      where: {
        organizationId,
        workOrderId,
        ...(canSeeAll
          ? {}
          : {
              OR: [
                { assigneeUserId: userId },
                { assigneeTeam: { memberships: { some: { userId } } } },
              ],
            }),
      },
      orderBy: { startAt: 'asc' },
      include: {
        assigneeUser: { select: { id: true, displayName: true, email: true } },
        assigneeTeam: { select: { id: true, name: true } },
      },
    });
  }

  private canManagePlanning(roles: string[]) {
    return roles.includes('planner') || roles.includes('org_admin') || roles.includes('system_admin');
  }
}

