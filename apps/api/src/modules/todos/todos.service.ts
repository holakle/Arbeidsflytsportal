import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, userId: string, status?: string, mineOnly?: boolean) {
    return this.prisma.todoItem.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
        ...(mineOnly ? { OR: [{ userId }, { team: { memberships: { some: { userId } } } }] } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(organizationId: string, payload: any) {
    return this.prisma.todoItem.create({
      data: {
        organizationId,
        userId: payload.userId ?? null,
        teamId: payload.teamId ?? null,
        title: payload.title,
        status: payload.status ?? 'OPEN',
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        description: payload.description ?? null,
      },
    });
  }

  async update(organizationId: string, id: string, payload: any) {
    const existing = await this.prisma.todoItem.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Todo not found');
    return this.prisma.todoItem.update({
      where: { id },
      data: {
        userId: payload.userId !== undefined ? payload.userId : undefined,
        teamId: payload.teamId !== undefined ? payload.teamId : undefined,
        title: payload.title,
        status: payload.status,
        dueDate: payload.dueDate !== undefined ? (payload.dueDate ? new Date(payload.dueDate) : null) : undefined,
        description: payload.description !== undefined ? payload.description : undefined,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.prisma.todoItem.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Todo not found');
    return this.prisma.todoItem.delete({ where: { id } });
  }
}

