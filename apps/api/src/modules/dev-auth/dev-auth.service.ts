import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class DevAuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    return users
      .map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        organizationId: user.organizationId,
        roles: user.userRoles.map((r) => r.role.code),
      }))
      .filter((user) => user.roles.length > 0);
  }

  async issueToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = user.userRoles.map((r) => r.role.code);
    if (roles.length === 0) {
      throw new ForbiddenException('User is inactive');
    }
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        displayName: user.displayName,
        organizationId: user.organizationId,
        roles,
      },
      process.env.JWT_SECRET ?? 'change-this-dev-secret',
      {
        issuer: process.env.JWT_ISSUER ?? 'workflow-dev',
        audience: process.env.JWT_AUDIENCE ?? 'workflow-clients',
        expiresIn: '24h',
      },
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        organizationId: user.organizationId,
        roles,
      },
    };
  }

  async removeUser(organizationId: string, actorUserId: string, targetUserId: string) {
    if (actorUserId === targetUserId) {
      throw new BadRequestException('Du kan ikke slette deg selv.');
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, organizationId },
      include: {
        userRoles: { include: { role: true } },
      },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    const targetRoleCodes = target.userRoles.map((ur) => ur.role.code);
    if (targetRoleCodes.includes('org_admin')) {
      const orgAdminCount = await this.prisma.userRole.count({
        where: {
          organizationId,
          role: { code: 'org_admin' },
        },
      });
      if (orgAdminCount <= 1) {
        throw new BadRequestException('Kan ikke slette siste org_admin.');
      }
    }

    const anonymizedEmail = `deleted+${target.id}@local.invalid`;
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({
        where: { userId: target.id, organizationId },
      }),
      this.prisma.teamMembership.deleteMany({
        where: { userId: target.id },
      }),
      this.prisma.user.update({
        where: { id: target.id },
        data: {
          email: anonymizedEmail,
          displayName: `Slettet bruker (${target.id.slice(0, 8)})`,
        },
      }),
    ]);

    return { success: true as const };
  }
}
