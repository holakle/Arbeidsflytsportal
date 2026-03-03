import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { StorageModule } from './common/storage/storage.module.js';
import { AuthModule } from './common/auth/auth.module.js';
import { AuditModule } from './common/audit/audit.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MeModule } from './modules/me/me.module.js';
import { WorkOrdersModule } from './modules/workorders/workorders.module.js';
import { EquipmentModule } from './modules/equipment/equipment.module.js';
import { TimesheetsModule } from './modules/timesheets/timesheets.module.js';
import { TodosModule } from './modules/todos/todos.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { DevAuthModule } from './modules/dev-auth/dev-auth.module.js';
import { ScheduleModule } from './modules/schedule/schedule.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';

const enableDevAuth =
  process.env.ENABLE_DEV_AUTH === 'true' || process.env.NODE_ENV !== 'production';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          // @nestjs/throttler expects ttl in milliseconds; keep env unit explicit to avoid ambiguity.
          ttl: Number(process.env.RATE_LIMIT_TTL_MS ?? 60000),
          limit: Number(process.env.RATE_LIMIT_LIMIT ?? 120),
        },
      ],
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    AuditModule,
    HealthModule,
    MeModule,
    WorkOrdersModule,
    EquipmentModule,
    TimesheetsModule,
    TodosModule,
    DashboardModule,
    ScheduleModule,
    NotificationsModule,
    ...(enableDevAuth ? [DevAuthModule] : []),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
