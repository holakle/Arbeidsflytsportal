import { Body, Controller, Delete, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { issueDevTokenSchema } from '@portal/shared';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { TenantGuard } from '../../common/auth/guards/tenant.guard.js';
import type { AuthUser } from '../../common/auth/types.js';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import { DevAuthService } from './dev-auth.service.js';

@Controller('dev-auth')
export class DevAuthController {
  constructor(@Inject(DevAuthService) private readonly service: DevAuthService) {}

  @Get('users')
  listUsers() {
    return this.service.listUsers();
  }

  @Post('token')
  issueToken(@Body(new ZodValidationPipe(issueDevTokenSchema)) body: { userId: string }) {
    return this.service.issueToken(body.userId);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('planner', 'org_admin', 'system_admin')
  removeUser(
    @CurrentUser() user: AuthUser,
    @Param('id') targetUserId: string,
  ) {
    return this.service.removeUser(user.organizationId, user.id, targetUserId);
  }
}
