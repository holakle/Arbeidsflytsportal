import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

type ScheduleQuery = {
  from: string;
  to: string;
  scope?: 'mine' | 'all';
  userId?: string;
  teamId?: string;
  assigneeUserId?: string;
  assigneeTeamId?: string;
  equipmentItemId?: string;
};

type UpsertSchedulePayload = {
  workOrderId: string;
  assigneeUserId?: string;
  assigneeTeamId?: string;
  startAt: string;
  endAt: string;
  note?: string;
  status?: string;
  allowConflict?: boolean;
};

@Injectable()
export class ScheduleService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async list(organizationId: string, userId: string, roles: string[], query: ScheduleQuery) {
    const canManageAll =
      roles.includes('planner') || roles.includes('org_admin') || roles.includes('system_admin');
    const scope = query.scope ?? 'mine';
    if (scope === 'all' && !canManageAll) {
      throw new ForbiddenException('scope=all is only allowed for planner/admin');
    }

    const from = new Date(query.from);
    const to = new Date(query.to);

    const scheduleWhere = {
      organizationId,
      startAt: { lt: to },
      endAt: { gt: from },
      ...((query.assigneeUserId ?? query.userId)
        ? { assigneeUserId: query.assigneeUserId ?? query.userId }
        : {}),
      ...((query.assigneeTeamId ?? query.teamId)
        ? { assigneeTeamId: query.assigneeTeamId ?? query.teamId }
        : {}),
      ...(scope === 'mine' && !canManageAll
        ? {
            OR: [
              { assigneeUserId: userId },
              { assigneeTeam: { memberships: { some: { userId } } } },
            ],
          }
        : {}),
    };

    const reservationWhere = {
      equipmentItem: {
        is: {
          organizationId,
          ...(query.equipmentItemId ? { id: query.equipmentItemId } : {}),
        },
      },
      startAt: { lt: to },
      endAt: { gt: from },
      ...(scope === 'mine' && !canManageAll
        ? {
            workOrder: {
              assignments: {
                some: {
                  OR: [
                    { assigneeUserId: userId },
                    { assigneeTeam: { memberships: { some: { userId } } } },
                  ],
                },
              },
            },
          }
        : {}),
    };

    const [schedules, reservations] = await this.prisma.$transaction([
      this.prisma.workOrderSchedule.findMany({
        where: scheduleWhere,
        include: {
          workOrder: {
            select: {
              id: true,
              title: true,
              status: true,
              customerName: true,
              addressLine1: true,
              city: true,
            },
          },
          assigneeUser: { select: { id: true, displayName: true } },
          assigneeTeam: { select: { id: true, name: true } },
        },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.equipmentReservation.findMany({
        where: reservationWhere,
        include: {
          workOrder: {
            select: {
              id: true,
              title: true,
              status: true,
              customerName: true,
              addressLine1: true,
              city: true,
            },
          },
          equipmentItem: { select: { id: true, name: true } },
        },
        orderBy: { startAt: 'asc' },
      }),
    ]);

    return [
      ...schedules.map((entry) => ({
        id: entry.id,
        type: 'workorder_schedule' as const,
        title: entry.workOrder.title,
        start: entry.startAt.toISOString(),
        end: entry.endAt.toISOString(),
        status: entry.status,
        note: entry.note,
        resourceRef: entry.assigneeUser
          ? {
              kind: 'user' as const,
              id: entry.assigneeUser.id,
              label: entry.assigneeUser.displayName,
            }
          : entry.assigneeTeam
            ? { kind: 'team' as const, id: entry.assigneeTeam.id, label: entry.assigneeTeam.name }
            : null,
        workOrderRef: {
          id: entry.workOrder.id,
          title: entry.workOrder.title,
          status: entry.workOrder.status,
          customerName: entry.workOrder.customerName,
          addressLine1: entry.workOrder.addressLine1,
          city: entry.workOrder.city,
        },
      })),
      ...reservations.map((entry) => ({
        id: entry.id,
        type: 'equipment_reservation' as const,
        title: entry.equipmentItem.name,
        start: entry.startAt.toISOString(),
        end: entry.endAt.toISOString(),
        status: null,
        note: null,
        resourceRef: {
          kind: 'equipment' as const,
          id: entry.equipmentItem.id,
          label: entry.equipmentItem.name,
        },
        workOrderRef: {
          id: entry.workOrder.id,
          title: entry.workOrder.title,
          status: entry.workOrder.status,
          customerName: entry.workOrder.customerName,
          addressLine1: entry.workOrder.addressLine1,
          city: entry.workOrder.city,
        },
      })),
    ].sort((a, b) => a.start.localeCompare(b.start));
  }

  async create(organizationId: string, actorUserId: string, payload: UpsertSchedulePayload) {
    await this.assertWorkOrder(organizationId, payload.workOrderId);
    await this.assertAssignee(organizationId, payload.assigneeUserId, payload.assigneeTeamId);
    const { startAt, endAt } = this.parseRange(payload.startAt, payload.endAt);
    const conflicts = await this.findConflicts(organizationId, {
      assigneeUserId: payload.assigneeUserId,
      assigneeTeamId: payload.assigneeTeamId,
      startAt,
      endAt,
    });
    if (conflicts.length > 0 && !payload.allowConflict) {
      throw new BadRequestException({
        code: 'SCHEDULE_CONFLICT',
        message: 'Schedule conflict detected',
        conflicts,
      });
    }

    const created = await this.prisma.workOrderSchedule.create({
      data: {
        organizationId,
        workOrderId: payload.workOrderId,
        assigneeUserId: payload.assigneeUserId ?? null,
        assigneeTeamId: payload.assigneeTeamId ?? null,
        startAt,
        endAt,
        note: payload.note ?? null,
        status: payload.status ?? 'PLANNED',
      },
    });
    await this.notifyByWorkOrder(organizationId, payload.workOrderId);
    return { ...created, conflicts };
  }

  async patch(
    organizationId: string,
    actorUserId: string,
    id: string,
    payload: Partial<UpsertSchedulePayload>,
  ) {
    const existing = await this.prisma.workOrderSchedule.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Schedule entry not found');

    const workOrderId = payload.workOrderId ?? existing.workOrderId;
    await this.assertWorkOrder(organizationId, workOrderId);
    await this.assertAssignee(
      organizationId,
      payload.assigneeUserId ?? existing.assigneeUserId ?? undefined,
      payload.assigneeTeamId ?? existing.assigneeTeamId ?? undefined,
    );
    const { startAt, endAt } = this.parseRange(
      payload.startAt ?? existing.startAt.toISOString(),
      payload.endAt ?? existing.endAt.toISOString(),
    );
    const conflicts = await this.findConflicts(
      organizationId,
      {
        assigneeUserId: payload.assigneeUserId ?? existing.assigneeUserId ?? undefined,
        assigneeTeamId: payload.assigneeTeamId ?? existing.assigneeTeamId ?? undefined,
        startAt,
        endAt,
      },
      existing.id,
    );
    if (conflicts.length > 0 && !payload.allowConflict) {
      throw new BadRequestException({
        code: 'SCHEDULE_CONFLICT',
        message: 'Schedule conflict detected',
        conflicts,
      });
    }

    const updated = await this.prisma.workOrderSchedule.update({
      where: { id: existing.id },
      data: {
        workOrderId,
        assigneeUserId:
          payload.assigneeUserId !== undefined ? payload.assigneeUserId : existing.assigneeUserId,
        assigneeTeamId:
          payload.assigneeTeamId !== undefined ? payload.assigneeTeamId : existing.assigneeTeamId,
        startAt,
        endAt,
        note: payload.note !== undefined ? payload.note : existing.note,
        status: payload.status ?? existing.status,
      },
    });
    await this.notifyByWorkOrder(organizationId, workOrderId);
    return { ...updated, conflicts };
  }

  private async assertWorkOrder(organizationId: string, workOrderId: string) {
    const exists = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('WorkOrder not found');
  }

  private async assertAssignee(
    organizationId: string,
    assigneeUserId?: string,
    assigneeTeamId?: string,
  ) {
    if (Boolean(assigneeUserId) === Boolean(assigneeTeamId)) {
      throw new BadRequestException('Exactly one of assigneeUserId or assigneeTeamId is required');
    }
    if (assigneeUserId) {
      const user = await this.prisma.user.findFirst({
        where: { id: assigneeUserId, organizationId },
        select: { id: true },
      });
      if (!user) throw new NotFoundException('Assignee user not found');
    }
    if (assigneeTeamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: assigneeTeamId, organizationId },
        select: { id: true },
      });
      if (!team) throw new NotFoundException('Assignee team not found');
    }
  }

  private parseRange(startAtRaw: string, endAtRaw: string) {
    const startAt = new Date(startAtRaw);
    const endAt = new Date(endAtRaw);
    if (!(startAt < endAt)) {
      throw new BadRequestException('startAt must be before endAt');
    }
    return { startAt, endAt };
  }

  private findConflicts(
    organizationId: string,
    payload: {
      assigneeUserId?: string;
      assigneeTeamId?: string;
      startAt: Date;
      endAt: Date;
    },
    excludeId?: string,
  ) {
    return this.prisma.workOrderSchedule.findMany({
      where: {
        organizationId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startAt: { lt: payload.endAt },
        endAt: { gt: payload.startAt },
        ...(payload.assigneeUserId ? { assigneeUserId: payload.assigneeUserId } : {}),
        ...(payload.assigneeTeamId ? { assigneeTeamId: payload.assigneeTeamId } : {}),
      },
      select: { id: true, workOrderId: true, startAt: true, endAt: true },
      take: 5,
    });
  }

  private async notifyByWorkOrder(organizationId: string, workOrderId: string) {
    const assignments = await this.prisma.assignment.findMany({
      where: { workOrderId },
      include: {
        assigneeTeam: {
          include: { memberships: { select: { userId: true } } },
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
      type: 'SCHEDULE_CHANGED',
      payload: { workOrderId },
    });
  }
}
