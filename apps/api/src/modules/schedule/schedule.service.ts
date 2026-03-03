import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

type ScheduleQuery = {
  from: string;
  to: string;
  scope?: 'mine' | 'all';
  assigneeUserId?: string;
  assigneeTeamId?: string;
  equipmentItemId?: string;
};

@Injectable()
export class ScheduleService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
      ...(query.assigneeUserId ? { assigneeUserId: query.assigneeUserId } : {}),
      ...(query.assigneeTeamId ? { assigneeTeamId: query.assigneeTeamId } : {}),
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
          workOrder: { select: { id: true, title: true, status: true } },
          assigneeUser: { select: { id: true, displayName: true } },
          assigneeTeam: { select: { id: true, name: true } },
        },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.equipmentReservation.findMany({
        where: reservationWhere,
        include: {
          workOrder: { select: { id: true, title: true, status: true } },
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
        },
      })),
    ].sort((a, b) => a.start.localeCompare(b.start));
  }
}
