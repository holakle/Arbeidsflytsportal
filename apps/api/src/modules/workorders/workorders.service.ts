import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { WorkOrderStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { STORAGE_PROVIDER, type StorageProvider } from '../../common/storage/storage-provider.interface.js';
import { NotificationsService } from '../notifications/notifications.service.js';

type CreateOrUpdateWorkOrderPayload = {
  title?: string;
  timesheetCode?: string;
  description?: string | null;
  status?: WorkOrderStatus;
  customerName?: string;
  contactName?: string;
  contactPhone?: string;
  addressLine1?: string;
  postalCode?: string;
  city?: string;
  lat?: number;
  lng?: number;
  accessNotes?: string;
  hmsNotes?: string;
  departmentId?: string | null;
  locationId?: string | null;
  projectId?: string | null;
  planningOwnerUserId?: string | null;
};

type CreateOrUpdateSubOrderPayload = {
  title?: string;
  timesheetCode?: string;
  description?: string | null;
  status?: string;
};

function normalizedOptional(value: string | null | undefined) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function buildTimesheetCode(prefix: 'WO' | 'DO') {
  const now = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${now}-${random}`;
}

@Injectable()
export class WorkOrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    query: { page: number; limit: number; status?: string; assignedToMe?: boolean },
  ) {
    const where = {
      organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status as WorkOrderStatus } : {}),
      ...(query.assignedToMe
        ? {
            assignments: {
              some: {
                OR: [
                  { assigneeUserId: userId },
                  { assigneeTeam: { memberships: { some: { userId } } } },
                ],
              },
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
        include: {
          assignments: true,
          department: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          subOrders: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { items, page: query.page, limit: query.limit, total };
  }

  create(organizationId: string, userId: string, body: CreateOrUpdateWorkOrderPayload) {
    const title = String(body.title ?? '').trim();
    if (!title) {
      throw new BadRequestException('Title is required');
    }

    return this.prisma.workOrder
      .create({
        data: {
          organizationId,
          createdByUserId: userId,
          title,
          timesheetCode: normalizedOptional(body.timesheetCode) ?? buildTimesheetCode('WO'),
          description: normalizedOptional(body.description),
          status: body.status ?? 'READY_FOR_PLANNING',
          customerName: normalizedOptional(body.customerName),
          contactName: normalizedOptional(body.contactName),
          contactPhone: normalizedOptional(body.contactPhone),
          addressLine1: normalizedOptional(body.addressLine1),
          postalCode: normalizedOptional(body.postalCode),
          city: normalizedOptional(body.city),
          lat: body.lat !== undefined ? new Prisma.Decimal(body.lat) : null,
          lng: body.lng !== undefined ? new Prisma.Decimal(body.lng) : null,
          accessNotes: normalizedOptional(body.accessNotes),
          hmsNotes: normalizedOptional(body.hmsNotes),
          departmentId: body.departmentId ?? null,
          locationId: body.locationId ?? null,
          projectId: body.projectId ?? null,
          planningOwnerUserId: body.planningOwnerUserId ?? null,
        },
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new BadRequestException('Timesheet code already exists in this organization');
        }
        throw error;
      });
  }

  async get(organizationId: string, id: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        assignments: true,
        department: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        subOrders: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!wo) throw new NotFoundException('WorkOrder not found');
    return wo;
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    body: CreateOrUpdateWorkOrderPayload,
  ) {
    const existing = await this.get(organizationId, id);
    if (body.title !== undefined && !String(body.title).trim()) {
      throw new BadRequestException('Title cannot be empty');
    }
    if (body.timesheetCode !== undefined && !normalizedOptional(body.timesheetCode)) {
      throw new BadRequestException('Timesheet code cannot be empty');
    }
    const updated = await this.prisma.workOrder
      .update({
        where: { id },
        data: {
          title: body.title !== undefined ? String(body.title).trim() : undefined,
          timesheetCode:
            body.timesheetCode !== undefined ? String(body.timesheetCode).trim() : undefined,
          description:
            body.description !== undefined ? normalizedOptional(body.description) : undefined,
          status: body.status ?? undefined,
          customerName:
            body.customerName !== undefined ? normalizedOptional(body.customerName) : undefined,
          contactName:
            body.contactName !== undefined ? normalizedOptional(body.contactName) : undefined,
          contactPhone:
            body.contactPhone !== undefined ? normalizedOptional(body.contactPhone) : undefined,
          addressLine1:
            body.addressLine1 !== undefined ? normalizedOptional(body.addressLine1) : undefined,
          postalCode:
            body.postalCode !== undefined ? normalizedOptional(body.postalCode) : undefined,
          city: body.city !== undefined ? normalizedOptional(body.city) : undefined,
          lat: body.lat !== undefined ? new Prisma.Decimal(body.lat) : undefined,
          lng: body.lng !== undefined ? new Prisma.Decimal(body.lng) : undefined,
          accessNotes:
            body.accessNotes !== undefined ? normalizedOptional(body.accessNotes) : undefined,
          hmsNotes: body.hmsNotes !== undefined ? normalizedOptional(body.hmsNotes) : undefined,
          departmentId: body.departmentId !== undefined ? body.departmentId : undefined,
          locationId: body.locationId !== undefined ? body.locationId : undefined,
          projectId: body.projectId !== undefined ? body.projectId : undefined,
          planningOwnerUserId:
            body.planningOwnerUserId !== undefined ? body.planningOwnerUserId : undefined,
        },
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new BadRequestException('Timesheet code already exists in this organization');
        }
        throw error;
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
      if (updated.status === 'BLOCKED' || updated.status === 'DONE') {
        await this.pushNotificationsForAssignments(
          organizationId,
          id,
          updated.status === 'BLOCKED' ? 'WORKORDER_BLOCKED' : 'WORKORDER_DONE',
        );
      }
    }

    return updated;
  }

  async remove(organizationId: string, id: string) {
    await this.get(organizationId, id);
    return this.prisma.workOrder.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async assign(
    organizationId: string,
    userId: string,
    id: string,
    payload: { assigneeUserId?: string; assigneeTeamId?: string },
  ) {
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

    await this.pushNotificationsForAssignments(organizationId, id, 'WORKORDER_ASSIGNED');

    return { success: true as const };
  }

  async listConsumables(organizationId: string, workOrderId: string) {
    await this.get(organizationId, workOrderId);
    return this.prisma.workOrderConsumable.findMany({
      where: { organizationId, workOrderId },
      orderBy: { createdAt: 'desc' },
      include: {
        equipmentItem: {
          select: { id: true, name: true, serialNumber: true, barcode: true, type: true },
        },
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
        equipmentItem: {
          select: { id: true, name: true, serialNumber: true, barcode: true, type: true },
        },
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

  async listSubOrders(organizationId: string, workOrderId: string) {
    await this.get(organizationId, workOrderId);
    return this.prisma.workOrderSubOrder.findMany({
      where: { organizationId, workOrderId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getSubOrder(organizationId: string, workOrderId: string, subOrderId: string) {
    await this.get(organizationId, workOrderId);
    const record = await this.prisma.workOrderSubOrder.findFirst({
      where: {
        id: subOrderId,
        organizationId,
        workOrderId,
        deletedAt: null,
      },
    });
    if (!record) {
      throw new NotFoundException('Sub-order not found');
    }
    return record;
  }

  async createSubOrder(
    organizationId: string,
    actorUserId: string,
    workOrderId: string,
    payload: CreateOrUpdateSubOrderPayload,
  ) {
    const workOrder = await this.get(organizationId, workOrderId);
    const title = String(payload.title ?? '').trim();
    const timesheetCode =
      normalizedOptional(payload.timesheetCode) ??
      (await this.generateSubOrderTimesheetCode(organizationId, workOrder.timesheetCode));
    if (!title) {
      throw new BadRequestException('Sub-order title is required');
    }

    return this.prisma.workOrderSubOrder
      .create({
        data: {
          organizationId,
          workOrderId,
          title,
          timesheetCode,
          description: normalizedOptional(payload.description),
          status: (payload.status as WorkOrderStatus | undefined) ?? 'DRAFT',
        },
      })
      .then(async (record) => {
        await this.audit.log({
          organizationId,
          actorUserId,
          action: 'workorder.suborder_created',
          entityType: 'WorkOrderSubOrder',
          entityId: record.id,
          after: {
            workOrderId,
            title: record.title,
            timesheetCode: record.timesheetCode,
          },
        });
        return record;
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new BadRequestException('Sub-order timesheet code already exists in this organization');
        }
        throw error;
      });
  }

  async updateSubOrder(
    organizationId: string,
    actorUserId: string,
    workOrderId: string,
    subOrderId: string,
    payload: CreateOrUpdateSubOrderPayload,
  ) {
    await this.getSubOrder(organizationId, workOrderId, subOrderId);
    if (payload.title !== undefined && !String(payload.title).trim()) {
      throw new BadRequestException('Sub-order title cannot be empty');
    }
    if (payload.timesheetCode !== undefined && !normalizedOptional(payload.timesheetCode)) {
      throw new BadRequestException('Sub-order timesheet code cannot be empty');
    }

    return this.prisma.workOrderSubOrder
      .update({
        where: { id: subOrderId },
        data: {
          title: payload.title !== undefined ? String(payload.title).trim() : undefined,
          timesheetCode:
            payload.timesheetCode !== undefined
              ? String(payload.timesheetCode).trim()
              : undefined,
          description:
            payload.description !== undefined ? normalizedOptional(payload.description) : undefined,
          status: (payload.status as WorkOrderStatus | undefined) ?? undefined,
        },
      })
      .then(async (record) => {
        await this.audit.log({
          organizationId,
          actorUserId,
          action: 'workorder.suborder_updated',
          entityType: 'WorkOrderSubOrder',
          entityId: record.id,
          after: payload,
        });
        return record;
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new BadRequestException('Sub-order timesheet code already exists in this organization');
        }
        throw error;
      });
  }

  async deleteSubOrder(
    organizationId: string,
    actorUserId: string,
    workOrderId: string,
    subOrderId: string,
  ) {
    await this.getSubOrder(organizationId, workOrderId, subOrderId);
    await this.prisma.workOrderSubOrder.update({
      where: { id: subOrderId },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      organizationId,
      actorUserId,
      action: 'workorder.suborder_deleted',
      entityType: 'WorkOrderSubOrder',
      entityId: subOrderId,
      after: { workOrderId },
    });
    return { success: true as const };
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
    payload: {
      assigneeUserId?: string;
      assigneeTeamId?: string;
      startAt: string;
      endAt: string;
      note?: string;
      status?: string;
      allowConflict?: boolean;
    },
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

    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);
    if (!(startAt < endAt)) {
      throw new BadRequestException('startAt must be before endAt');
    }

    const conflicts = await this.prisma.workOrderSchedule.findMany({
      where: {
        organizationId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(payload.assigneeUserId ? { assigneeUserId: payload.assigneeUserId } : {}),
        ...(payload.assigneeTeamId ? { assigneeTeamId: payload.assigneeTeamId } : {}),
      },
      select: { id: true, workOrderId: true, startAt: true, endAt: true },
      take: 5,
    });
    if (conflicts.length > 0 && !payload.allowConflict) {
      throw new BadRequestException({
        message: 'Schedule conflict detected',
        code: 'SCHEDULE_CONFLICT',
        conflicts,
      });
    }

    const record = await this.prisma.workOrderSchedule.create({
      data: {
        organizationId,
        workOrderId,
        assigneeUserId: payload.assigneeUserId ?? null,
        assigneeTeamId: payload.assigneeTeamId ?? null,
        startAt,
        endAt,
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

    await this.pushNotificationsForAssignments(organizationId, workOrderId, 'SCHEDULE_CHANGED');

    return { ...record, conflicts };
  }

  async deleteSchedule(
    organizationId: string,
    actorUserId: string,
    workOrderId: string,
    scheduleId: string,
  ) {
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

  async listScheduleForWorkOrder(
    organizationId: string,
    userId: string,
    roles: string[],
    workOrderId: string,
  ) {
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

  async startSession(organizationId: string, userId: string, workOrderId: string) {
    await this.get(organizationId, workOrderId);
    const activeSession = await this.prisma.workSession.findFirst({
      where: { organizationId, userId, state: 'RUNNING' },
    });
    if (activeSession) {
      throw new BadRequestException('User already has an active running session');
    }

    await this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'IN_PROGRESS' },
    });

    const session = await this.prisma.workSession.create({
      data: {
        organizationId,
        userId,
        workOrderId,
        startedAt: new Date(),
        state: 'RUNNING',
      },
    });

    return { session };
  }

  async pauseSession(organizationId: string, userId: string, workOrderId: string) {
    await this.get(organizationId, workOrderId);
    const active = await this.prisma.workSession.findFirst({
      where: { organizationId, userId, workOrderId, state: 'RUNNING' },
    });
    if (!active) {
      throw new NotFoundException('No active session for this work order');
    }
    return this.prisma.workSession.update({
      where: { id: active.id },
      data: { state: 'PAUSED' },
    });
  }

  async finishSession(organizationId: string, userId: string, workOrderId: string) {
    await this.get(organizationId, workOrderId);
    const active = await this.prisma.workSession.findFirst({
      where: { organizationId, userId, workOrderId, state: { in: ['RUNNING', 'PAUSED'] } },
      orderBy: { startedAt: 'desc' },
    });
    if (!active) {
      throw new NotFoundException('No active session for this work order');
    }
    const endedAt = new Date();
    const session = await this.prisma.workSession.update({
      where: { id: active.id },
      data: { state: 'DONE', endedAt },
    });

    const hours = Math.max(0.25, (endedAt.getTime() - active.startedAt.getTime()) / 3600000);
    const timesheet = await this.prisma.timesheetEntry.create({
      data: {
        organizationId,
        userId,
        workOrderId,
        date: endedAt,
        activityType: 'INSTALLATION',
        hours: new Prisma.Decimal(Number(hours.toFixed(2))),
        note: 'Auto draft from WorkSession',
        status: 'DRAFT',
      },
    });

    return {
      session,
      timesheetDraftId: timesheet.id,
      timesheetDraftHours: Number(hours.toFixed(2)),
    };
  }

  async listAttachments(organizationId: string, workOrderId: string) {
    await this.get(organizationId, workOrderId);
    return this.prisma.attachment.findMany({
      where: { organizationId, workOrderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addAttachment(
    organizationId: string,
    actorUserId: string,
    workOrderId: string,
    payload: {
      fileName: string;
      mimeType: string;
      contentBase64: string;
      kind?: 'BEFORE' | 'AFTER' | 'GENERAL' | 'DEVIATION' | 'SIGNATURE';
    },
  ) {
    await this.get(organizationId, workOrderId);
    const raw = payload.contentBase64.includes(',')
      ? payload.contentBase64.split(',').at(-1) ?? payload.contentBase64
      : payload.contentBase64;
    const fileBuffer = Buffer.from(raw, 'base64');
    if (fileBuffer.byteLength === 0) {
      throw new BadRequestException('Attachment content is empty');
    }

    const saved = await this.storage.save({
      organizationId,
      workOrderId,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      content: fileBuffer,
    });

    return this.prisma.attachment.create({
      data: {
        organizationId,
        workOrderId,
        uploadedByUserId: actorUserId,
        kind: payload.kind ?? 'GENERAL',
        mimeType: payload.mimeType,
        size: fileBuffer.byteLength,
        storageKey: saved.storageKey,
        url: saved.url ?? null,
      },
    });
  }

  private async pushNotificationsForAssignments(
    organizationId: string,
    workOrderId: string,
    type: 'WORKORDER_ASSIGNED' | 'SCHEDULE_CHANGED' | 'WORKORDER_BLOCKED' | 'WORKORDER_DONE',
  ) {
    const assignments = await this.prisma.assignment.findMany({
      where: { workOrderId },
      include: {
        assigneeTeam: {
          include: {
            memberships: { select: { userId: true } },
          },
        },
      },
    });
    const userIds = assignments.flatMap((assignment) => [
      ...(assignment.assigneeUserId ? [assignment.assigneeUserId] : []),
      ...((assignment.assigneeTeam?.memberships ?? []).map((membership) => membership.userId) ?? []),
    ]);

    await this.notifications.createForUsers({
      organizationId,
      userIds,
      type,
      payload: { workOrderId },
    });
  }

  private canManagePlanning(roles: string[]) {
    return (
      roles.includes('planner') || roles.includes('org_admin') || roles.includes('system_admin')
    );
  }

  private async generateSubOrderTimesheetCode(organizationId: string, parentTimesheetCode: string) {
    const prefix = `${parentTimesheetCode}-D`;
    const existing = await this.prisma.workOrderSubOrder.findMany({
      where: {
        organizationId,
        timesheetCode: { startsWith: prefix },
      },
      select: { timesheetCode: true },
    });
    const existingSet = new Set(existing.map((item) => item.timesheetCode));
    let index = 1;
    while (existingSet.has(`${prefix}${index}`)) {
      index += 1;
    }
    return `${prefix}${index}`;
  }
}
