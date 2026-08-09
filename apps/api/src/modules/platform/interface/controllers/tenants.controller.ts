import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../../../core/auth/public.decorator';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { CreateTenantUseCase } from '../../application/use-cases/create-tenant.use-case';
import { ListTenantsUseCase } from '../../application/use-cases/list-tenants.use-case';
import { CreateTenantDto } from '../dtos/create-tenant.dto';

/**
 * Rutas de plataforma: no requieren JWT de tenant (no hay tenant resuelto
 * en estas rutas, ver exclusión en app.module.ts), se protegen con
 * `PlatformAdminGuard` en su lugar.
 */
@Controller('platform/tenants')
@Public()
@UseGuards(PlatformAdminGuard)
export class TenantsController {
  constructor(
    private readonly createTenant: CreateTenantUseCase,
    private readonly listTenants: ListTenantsUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateTenantDto) {
    return this.createTenant.execute(dto);
  }

  @Get()
  async list() {
    return this.listTenants.execute();
  }
}
