import jwt from 'jsonwebtoken';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { OidcAdapter } from './oidc-adapter.interface.js';
import type { AuthUser } from '../types.js';

@Injectable()
export class DevJwtAdapter implements OidcAdapter {
  async verify(token: string): Promise<AuthUser> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) throw new UnauthorizedException('JWT_SECRET is not configured');
      const payload = jwt.verify(token, jwtSecret, {
        issuer: process.env.JWT_ISSUER ?? 'workflow-dev',
        audience: process.env.JWT_AUDIENCE ?? 'workflow-clients',
      }) as jwt.JwtPayload;

      return {
        id: String(payload.sub),
        email: String(payload.email),
        displayName: String(payload.displayName ?? payload.email),
        organizationId: String(payload.organizationId),
        roles: Array.isArray(payload.roles) ? payload.roles.map(String) : [],
      };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

