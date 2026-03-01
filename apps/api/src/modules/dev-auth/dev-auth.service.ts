import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      organizationId: user.organizationId,
      roles: user.userRoles.map((r) => r.role.code),
    }));
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
}
