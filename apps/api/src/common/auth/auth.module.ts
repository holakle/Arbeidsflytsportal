import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { DevJwtAdapter } from './oidc/dev-jwt.adapter.js';

@Global()
@Module({
  providers: [AuthService, DevJwtAdapter],
  exports: [AuthService],
})
export class AuthModule {}

