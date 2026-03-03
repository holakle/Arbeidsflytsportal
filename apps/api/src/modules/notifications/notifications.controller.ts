import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { markNotificationsReadSchema } from '@portal/shared';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { TenantGuard } from '../../common/auth/guards/tenant.guard.js';
import type { AuthUser } from '../../common/auth/types.js';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.organizationId, user.id);
  }

  @Post('read')
  markRead(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(markNotificationsReadSchema)) body: { ids: string[] },
  ) {
    return this.service.markRead(user.organizationId, user.id, body.ids);
  }
}
