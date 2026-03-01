import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = await this.authService.verifyBearerToken(req.headers.authorization as string | undefined);
    if (!user) {
      throw new UnauthorizedException('Missing bearer token');
    }
    req.user = user;
    return true;
  }
}

