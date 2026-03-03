import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    let db: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }

    return {
      ok: true,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      db,
    };
  }
}
