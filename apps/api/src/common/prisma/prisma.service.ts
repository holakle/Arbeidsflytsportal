import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const maxAttempts = 10;
    const baseDelayMs = 500;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), 5000);
        this.logger.warn(
          `Database not ready (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms.`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}
