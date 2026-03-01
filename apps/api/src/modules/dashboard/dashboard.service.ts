import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

const defaultWidgets = [
  { type: 'MY_WORKORDERS', title: 'Mine arbeidsordre', config: {} },
  { type: 'BOOKINGS', title: 'Bookinger', config: {} },
  { type: 'HOURS_THIS_WEEK', title: 'Timer denne uken', config: {} },
  { type: 'TODO', title: 'Todo', config: {} },
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(organizationId: string, userId: string) {
    let dashboard = await this.prisma.dashboard.findFirst({
      where: { organizationId, userId },
      include: { widgets: true, layout: true },
    });

    if (!dashboard) {
      dashboard = await this.prisma.dashboard.create({
        data: {
          organizationId,
          userId,
          widgets: { create: defaultWidgets },
          layout: {
            create: {
              columns: 4,
              layout: defaultWidgets.map((_, i) => ({ widgetIndex: i, x: (i % 2) * 2, y: Math.floor(i / 2) * 2, w: 2, h: 2 })),
            },
          },
        },
        include: { widgets: true, layout: true },
      });
    }

    return {
      widgets: dashboard.widgets,
      layout: dashboard.layout,
    };
  }

  async update(organizationId: string, userId: string, payload: { widgets: any[]; layout: any }) {
    const dashboard = await this.prisma.dashboard.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      update: {},
      create: { organizationId, userId },
    });

    await this.prisma.$transaction([
      this.prisma.widgetInstance.deleteMany({ where: { dashboardId: dashboard.id } }),
      this.prisma.widgetInstance.createMany({
        data: payload.widgets.map((w) => ({
          dashboardId: dashboard.id,
          type: w.type,
          title: w.title,
          config: w.config ?? {},
        })),
      }),
      this.prisma.dashboardLayout.upsert({
        where: { dashboardId: dashboard.id },
        update: { columns: payload.layout.columns, layout: payload.layout.layout },
        create: { dashboardId: dashboard.id, columns: payload.layout.columns, layout: payload.layout.layout },
      }),
    ]);

    return this.getOrCreate(organizationId, userId);
  }
}

