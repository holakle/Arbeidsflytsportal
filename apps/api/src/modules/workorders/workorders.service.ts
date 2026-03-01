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
}

