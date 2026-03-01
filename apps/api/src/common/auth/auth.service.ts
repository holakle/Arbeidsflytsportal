import { Inject, Injectable } from '@nestjs/common';
import { DevJwtAdapter } from './oidc/dev-jwt.adapter.js';

@Injectable()
export class AuthService {
  constructor(@Inject(DevJwtAdapter) private readonly oidcAdapter: DevJwtAdapter) {}

  async verifyBearerToken(header?: string) {
    if (!header?.startsWith('Bearer ')) {
      return null;
    }
    const token = header.replace('Bearer ', '');
    return this.oidcAdapter.verify(token);
  }
}

