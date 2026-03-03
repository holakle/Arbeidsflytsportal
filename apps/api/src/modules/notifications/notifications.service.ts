import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type NotificationType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(organizationId: string, userId: string) {
    return this.prisma.notification.findMany({
      where: { organizationId, userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(organizationId: string, userId: string, ids: string[]) {
    const result = await this.prisma.notification.updateMany({
      where: { organizationId, userId, id: { in: ids }, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true as const, updated: result.count };
  }

  async createForUsers(params: {
    organizationId: string;
    userIds: string[];
    type: NotificationType;
    payload: Record<string, unknown>;
  }) {
    const uniqueUserIds = Array.from(new Set(params.userIds.filter(Boolean)));
    if (uniqueUserIds.length === 0) return;
    await this.prisma.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        organizationId: params.organizationId,
        userId,
        type: params.type,
        payload: params.payload as Prisma.InputJsonValue,
      })),
    });
  }
}
