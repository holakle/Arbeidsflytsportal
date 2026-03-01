import { AuthUser } from '../types.js';

export interface OidcAdapter {
  verify(token: string): Promise<AuthUser>;
}

