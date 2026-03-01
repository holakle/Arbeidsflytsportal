import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  list(organizationId: string, userId: string, from?: string, to?: string) {
    return this.prisma.timesheetEntry.findMany({
      where: {
        organizationId,
        userId,
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
    });
  }

  async create(
    organizationId: string,
    userId: string,
    payload: { date: string; hours: number; activityType: string; workOrderId?: string | null; projectId?: string | null; note?: string },
  ) {
    const entry = await this.prisma.timesheetEntry.create({
      data: {
        organizationId,
        userId,
        date: new Date(payload.date),
        hours: new Prisma.Decimal(payload.hours),
        activityType: payload.activityType,
        workOrderId: payload.workOrderId ?? null,
        projectId: payload.projectId ?? null,
        note: payload.note ?? null,
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: 'timesheet.submitted',
      entityType: 'TimesheetEntry',
      entityId: entry.id,
      after: payload,
    });

    return entry;
  }

  async update(organizationId: string, userId: string, id: string, payload: Record<string, unknown>) {
    const existing = await this.prisma.timesheetEntry.findFirst({ where: { id, organizationId, userId } });
    if (!existing) throw new NotFoundException('Timesheet not found');

    return this.prisma.timesheetEntry.update({
      where: { id },
      data: {
        date: payload.date ? new Date(String(payload.date)) : undefined,
        hours: payload.hours ? new Prisma.Decimal(Number(payload.hours)) : undefined,
        activityType: payload.activityType ? String(payload.activityType) : undefined,
        workOrderId: payload.workOrderId !== undefined ? (payload.workOrderId as string | null) : undefined,
        projectId: payload.projectId !== undefined ? (payload.projectId as string | null) : undefined,
        note: payload.note !== undefined ? (payload.note as string | null) : undefined,
      },
    });
  }

  async remove(organizationId: string, userId: string, id: string) {
    const existing = await this.prisma.timesheetEntry.findFirst({ where: { id, organizationId, userId } });
    if (!existing) throw new NotFoundException('Timesheet not found');
    return this.prisma.timesheetEntry.delete({ where: { id } });
  }

  async weeklySummary(organizationId: string, userId: string, weekStartRaw?: string) {
    const weekStart = weekStartRaw ? new Date(weekStartRaw) : toWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const entries = await this.prisma.timesheetEntry.findMany({
      where: { organizationId, userId, date: { gte: weekStart, lt: weekEnd } },
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
}

