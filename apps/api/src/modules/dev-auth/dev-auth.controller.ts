import { Body, Controller, Get, Inject, Post, UsePipes } from '@nestjs/common';
import { issueDevTokenSchema } from '@portal/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import { DevAuthService } from './dev-auth.service.js';

@Controller('dev-auth')
export class DevAuthController {
  constructor(@Inject(DevAuthService) private readonly service: DevAuthService) {}

  @Get('users')
  listUsers() {
    return this.service.listUsers();
  }

  @Post('token')
  @UsePipes(new ZodValidationPipe(issueDevTokenSchema))
  issueToken(@Body() body: { userId: string }) {
    return this.service.issueToken(body.userId);
  }
}
