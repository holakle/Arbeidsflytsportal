import { Module } from '@nestjs/common';
import { DevAuthController } from './dev-auth.controller.js';
import { DevAuthService } from './dev-auth.service.js';

@Module({
  controllers: [DevAuthController],
  providers: [DevAuthService],
})
export class DevAuthModule {}
