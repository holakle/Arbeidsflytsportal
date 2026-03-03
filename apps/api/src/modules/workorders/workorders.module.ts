import { Module } from '@nestjs/common';
import { WorkOrdersController } from './workorders.controller.js';
import { WorkOrdersService } from './workorders.service.js';

@Module({
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
})
export class WorkOrdersModule {}
