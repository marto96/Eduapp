import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../../../core/auth/public.decorator';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { PlatformCreateTenantUserUseCase } from '../../application/use-cases/platform-create-tenant-user.use-case';
import { PlatformListTenantUsersUseCase } from '../../application/use-cases/platform-list-tenant-users.use-case';
import { PlatformEditTenantUserUseCase } from '../../application/use-cases/platform-edit-tenant-user.use-case';
import { PlatformDeactivateTenantUserUseCase } from '../../application/use-cases/platform-deactivate-tenant-user.use-case';
import { PlatformReactivateTenantUserUseCase } from '../../application/use-cases/platform-reactivate-tenant-user.use-case';
import { PlatformResetTenantUserPasswordUseCase } from '../../application/use-cases/platform-reset-tenant-user-password.use-case';
import { PlatformImpersonateTenantUserUseCase } from '../../application/use-cases/platform-impersonate-tenant-user.use-case';
import { CreateUserDto } from '../../../identity/interface/dtos/create-user.dto';
import { EditUserDto } from '../../../identity/interface/dtos/edit-user.dto';
import { ListUsersQueryDto } from '../../../identity/interface/dtos/list-users-query.dto';
import { User } from '../../../identity/domain/entities/user.entity';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

/**
 * Mismo criterio de protección que `TenantsController`: sin JWT de tenant
 * (no hay ninguno resuelto en rutas de `/platform`), `PlatformAdminGuard`
 * en su lugar.
 */
function toResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    status: user.status,
    birthDate: user.birthDate,
    documentType: user.documentType,
    documentNumber: user.documentNumber,
    address: user.address,
  };
}

@Controller('platform/tenants/:tenantId/users')
@Public()
@UseGuards(PlatformAdminGuard)
export class PlatformTenantUsersController {
  constructor(
    private readonly createUser: PlatformCreateTenantUserUseCase,
    private readonly listUsers: PlatformListTenantUsersUseCase,
    private readonly editUser: PlatformEditTenantUserUseCase,
    private readonly deactivateUser: PlatformDeactivateTenantUserUseCase,
    private readonly reactivateUser: PlatformReactivateTenantUserUseCase,
    private readonly resetPassword: PlatformResetTenantUserPasswordUseCase,
    private readonly impersonateUser: PlatformImpersonateTenantUserUseCase,
  ) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateUserDto,
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
  ) {
    const user = await this.createUser.execute(tenantId, dto, req.platformAdmin);
    return toResponse(user);
  }

  @Get()
  async list(@Param('tenantId') tenantId: string, @Query() query: ListUsersQueryDto) {
    const result = await this.listUsers.execute(tenantId, query.role, query.page, query.pageSize, query.search);
    if (Array.isArray(result)) return result.map(toResponse);
    return { ...result, items: result.items.map(toResponse) };
  }

  @Patch(':id')
  async edit(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: EditUserDto,
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
  ) {
    const user = await this.editUser.execute(tenantId, id, dto, req.platformAdmin);
    return toResponse(user);
  }

  @Patch(':id/reset-password')
  async resetPasswordRoute(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
  ) {
    return this.resetPassword.execute(tenantId, id, req.platformAdmin);
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
  ) {
    const user = await this.deactivateUser.execute(tenantId, id, req.platformAdmin);
    return toResponse(user);
  }

  @Patch(':id/reactivate')
  async reactivate(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
  ) {
    const user = await this.reactivateUser.execute(tenantId, id, req.platformAdmin);
    return toResponse(user);
  }

  @Post(':id/impersonate')
  async impersonate(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
  ) {
    return this.impersonateUser.execute(tenantId, id, req.platformAdmin);
  }
}
