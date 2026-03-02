import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

const defaultWidgets = [
  { type: 'MY_WORKORDERS', title: 'Mine arbeidsordre', config: {} },
  { type: 'BOOKINGS', title: 'Bookinger', config: {} },
  { type: 'HOURS_THIS_WEEK', title: 'Timer denne uken', config: {} },
  { type: 'TODO', title: 'Todo', config: {} },
  { type: 'MY_CALENDAR', title: 'Kalender (mine bookinger)', config: { rangeDays: 14, showEquipment: true } },
];

@Injectable()
export class DashboardService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
    } else if (!dashboard.widgets.some((widget) => widget.type === 'MY_CALENDAR')) {
      const createdWidget = await this.prisma.widgetInstance.create({
        data: {
          dashboardId: dashboard.id,
          type: 'MY_CALENDAR',
          title: 'Kalender (mine bookinger)',
          config: { rangeDays: 14, showEquipment: true },
        },
      });

      const layoutItems = Array.isArray(dashboard.layout?.layout) ? (dashboard.layout?.layout as any[]) : [];
      const maxY = layoutItems.reduce((max, item) => Math.max(max, Number(item?.y ?? 0) + Number(item?.h ?? 0)), 0);
      const nextLayout = [...layoutItems, { widgetInstanceId: createdWidget.id, x: 0, y: maxY + 1, w: 2, h: 2 }];

      if (dashboard.layout) {
        await this.prisma.dashboardLayout.update({
          where: { id: dashboard.layout.id },
          data: { layout: nextLayout },
        });
      } else {
        await this.prisma.dashboardLayout.create({
          data: { dashboardId: dashboard.id, columns: 4, layout: nextLayout },
        });
      }

      dashboard = await this.prisma.dashboard.findFirst({
        where: { organizationId, userId },
        include: { widgets: true, layout: true },
      });
    }

    if (!dashboard) {
      throw new Error('Dashboard not found after getOrCreate');
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

