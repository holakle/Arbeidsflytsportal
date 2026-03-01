import { Body, Controller, Get, Inject, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { reserveEquipmentSchema } from '@portal/shared';
import { z } from 'zod';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { TenantGuard } from '../../common/auth/guards/tenant.guard.js';
import type { AuthUser } from '../../common/auth/types.js';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import { EquipmentService } from './equipment.service.js';

const listReservationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  equipmentItemId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

@Controller('equipment')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class EquipmentController {
  constructor(@Inject(EquipmentService) private readonly service: EquipmentService) {}

  @Get()
  @Roles('planner', 'technician', 'org_admin')
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.organizationId);
  }

  @Get('reservations')
  @Roles('planner', 'technician', 'org_admin')
  listReservations(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    const parsed = listReservationsQuerySchema.parse(query);
    return this.service.listReservations(user.organizationId, parsed);
  }

  @Post('reserve')
  @Roles('planner', 'org_admin')
  @UsePipes(new ZodValidationPipe(reserveEquipmentSchema))
  reserve(
    @CurrentUser() user: AuthUser,
    @Body() body: { equipmentItemId: string; workOrderId: string; startAt: string; endAt: string },
  ) {
    return this.service.reserve(user.organizationId, user.id, body);
  }
}
