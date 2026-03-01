import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/auth/guards/tenant.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/auth/types.js';

@Controller('me')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const roles = await this.prisma.userRole.findMany({
      where: { userId: user.id, organizationId: user.organizationId },
      include: { role: true },
    });

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.displayName,
        organizationId: dbUser.organizationId,
      },
      roles: roles.map((r) => r.role.code),
      organizationId: user.organizationId,
    };
  }
}

