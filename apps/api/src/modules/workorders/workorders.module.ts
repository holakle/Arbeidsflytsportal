import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { WorkOrdersController } from './workorders.controller.js';
import { WorkOrdersService } from './workorders.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
})
export class WorkOrdersModule {}
