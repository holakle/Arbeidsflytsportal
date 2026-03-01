import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { DevJwtAdapter } from './oidc/dev-jwt.adapter.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { TenantGuard } from './guards/tenant.guard.js';

@Global()
@Module({
  providers: [AuthService, DevJwtAdapter, JwtAuthGuard, RolesGuard, TenantGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, TenantGuard],
})
export class AuthModule {}
