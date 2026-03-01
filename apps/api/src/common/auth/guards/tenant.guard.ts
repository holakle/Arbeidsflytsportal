import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user?.organizationId) {
      throw new ForbiddenException('Missing organization scope');
    }
    req.organizationId = req.user.organizationId;
    return true;
  }
}

