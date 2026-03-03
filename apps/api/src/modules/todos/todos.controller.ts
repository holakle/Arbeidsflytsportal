import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { createTodoSchema, updateTodoSchema } from '@portal/shared';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { TenantGuard } from '../../common/auth/guards/tenant.guard.js';
import type { AuthUser } from '../../common/auth/types.js';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import { TodosService } from './todos.service.js';

@Controller('todos')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class TodosController {
  constructor(@Inject(TodosService) private readonly service: TodosService) {}

  @Get()
  @Roles('planner', 'technician', 'member', 'org_admin')
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('mineOnly') mineOnly?: string,
  ) {
    return this.service.list(user.organizationId, user.id, status, mineOnly === 'true');
  }

  @Post()
  @Roles('planner', 'technician', 'member', 'org_admin')
  create(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(createTodoSchema)) body: any) {
    return this.service.create(user.organizationId, body);
  }

  @Patch(':id')
  @Roles('planner', 'technician', 'member', 'org_admin')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTodoSchema)) body: any,
  ) {
    return this.service.update(user.organizationId, id, body);
  }

  @Delete(':id')
  @Roles('planner', 'technician', 'member', 'org_admin')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.organizationId, id);
  }
}
