import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type TimesheetStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

function toWeekStart(date: Date): Date {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class TimesheetsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    roles: string[],
    from?: string,
    to?: string,
    requestedUserId?: string,
  ) {
    const targetUserId = await this.resolveTargetUserId(
      organizationId,
      userId,
      roles,
      requestedUserId,
    );
    return this.prisma.timesheetEntry.findMany({
      where: {
        organizationId,
        userId: targetUserId,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: 'desc' },
      include: {
        workOrder: {
          select: {
            id: true,
            title: true,
            timesheetCode: true,
          },
        },
        subOrder: {
          select: {
            id: true,
            title: true,
            workOrderId: true,
            timesheetCode: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    roles: string[],
    payload: {
      date: string;
      hours: number;
      activityType: string;
      userId?: string | null;
      workOrderId?: string | null;
      subOrderId?: string | null;
      projectId?: string | null;
      note?: string;
      status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
    },
  ) {
    const targetUserId = await this.resolveTargetUserId(
      organizationId,
      userId,
      roles,
      payload.userId ?? undefined,
    );
    const resolvedRefs = await this.resolveWorkOrderAndSubOrder(
      organizationId,
      payload.workOrderId ?? null,
      payload.subOrderId ?? null,
    );
    const entry = await this.prisma.timesheetEntry.create({
      data: {
        organizationId,
        userId: targetUserId,
        date: new Date(payload.date),
        hours: new Prisma.Decimal(payload.hours),
        activityType: payload.activityType,
        workOrderId: resolvedRefs.workOrderId,
        subOrderId: resolvedRefs.subOrderId,
        projectId: payload.projectId ?? null,
        note: payload.note ?? null,
        status: payload.status ?? 'SUBMITTED',
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: 'timesheet.submitted',
      entityType: 'TimesheetEntry',
      entityId: entry.id,
      after: { ...payload, userId: targetUserId },
    });

    return entry;
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    payload: Record<string, unknown>,
  ) {
    const existing = await this.prisma.timesheetEntry.findFirst({
      where: { id, organizationId, userId },
    });
    if (!existing) throw new NotFoundException('Timesheet not found');
    const nextWorkOrderId =
      payload.workOrderId !== undefined ? (payload.workOrderId as string | null) : existing.workOrderId;
    const nextSubOrderId =
      payload.subOrderId !== undefined ? (payload.subOrderId as string | null) : existing.subOrderId;
    const resolvedRefs = await this.resolveWorkOrderAndSubOrder(
      organizationId,
      nextWorkOrderId,
      nextSubOrderId,
    );

    return this.prisma.timesheetEntry.update({
      where: { id },
      data: {
        date: payload.date ? new Date(String(payload.date)) : undefined,
        hours: payload.hours ? new Prisma.Decimal(Number(payload.hours)) : undefined,
        activityType: payload.activityType ? String(payload.activityType) : undefined,
        workOrderId: resolvedRefs.workOrderId,
        subOrderId: resolvedRefs.subOrderId,
        projectId:
          payload.projectId !== undefined ? (payload.projectId as string | null) : undefined,
        note: payload.note !== undefined ? (payload.note as string | null) : undefined,
        status: payload.status ? (payload.status as TimesheetStatus) : undefined,
      },
    });
  }

  async remove(organizationId: string, userId: string, id: string) {
    const existing = await this.prisma.timesheetEntry.findFirst({
      where: { id, organizationId, userId },
    });
    if (!existing) throw new NotFoundException('Timesheet not found');
    return this.prisma.timesheetEntry.delete({ where: { id } });
  }

  async weeklySummary(
    organizationId: string,
    userId: string,
    roles: string[],
    weekStartRaw?: string,
    requestedUserId?: string,
  ) {
    const targetUserId = await this.resolveTargetUserId(
      organizationId,
      userId,
      roles,
      requestedUserId,
    );
    const weekStart = weekStartRaw ? new Date(weekStartRaw) : toWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const entries = await this.prisma.timesheetEntry.findMany({
      where: { organizationId, userId: targetUserId, date: { gte: weekStart, lt: weekEnd } },
    });

    const byActivityType: Record<string, number> = {};
    let totalHours = 0;

    for (const entry of entries) {
      const hours = Number(entry.hours);
      totalHours += hours;
      byActivityType[entry.activityType] = (byActivityType[entry.activityType] ?? 0) + hours;
    }

    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      totalHours,
      byActivityType,
    };
  }

  private canManageOtherUsers(roles: string[]) {
    return (
      roles.includes('planner') || roles.includes('org_admin') || roles.includes('system_admin')
    );
  }

  private async resolveTargetUserId(
    organizationId: string,
    actorUserId: string,
    roles: string[],
    requestedUserId?: string,
  ) {
    if (!requestedUserId || requestedUserId === actorUserId) {
      return actorUserId;
    }

    if (!this.canManageOtherUsers(roles)) {
      throw new ForbiddenException('Not allowed to manage timesheets for other users');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: { id: requestedUserId, organizationId },
      select: { id: true },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }
    return targetUser.id;
  }

  private async resolveWorkOrderAndSubOrder(
    organizationId: string,
    workOrderId: string | null,
    subOrderId: string | null,
  ) {
    const normalizedWorkOrderId = workOrderId?.trim() || null;
    const normalizedSubOrderId = subOrderId?.trim() || null;

    if (normalizedSubOrderId) {
      const subOrder = await this.prisma.workOrderSubOrder.findFirst({
        where: {
          id: normalizedSubOrderId,
          organizationId,
          deletedAt: null,
        },
        select: { id: true, workOrderId: true },
      });
      if (!subOrder) {
        throw new NotFoundException('Sub-order not found');
      }
      if (normalizedWorkOrderId && normalizedWorkOrderId !== subOrder.workOrderId) {
        throw new BadRequestException('Sub-order does not belong to selected work order');
      }
      return { workOrderId: subOrder.workOrderId, subOrderId: subOrder.id };
    }

    if (normalizedWorkOrderId) {
      const workOrder = await this.prisma.workOrder.findFirst({
        where: { id: normalizedWorkOrderId, organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!workOrder) {
        throw new NotFoundException('Work order not found');
      }
      return { workOrderId: workOrder.id, subOrderId: null };
    }

    return { workOrderId: null, subOrderId: null };
  }
}
