import { Controller, Get, NotFoundException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { TenantRegistryService } from './tenant-registry.service';
import { getCurrentTenant } from './tenant-context';

const DEFAULT_PRIMARY_COLOR = '#9184d9';

/**
 * Info pública del tenant actual (nombre, color de marca) — sin JWT,
 * pero con el tenant ya resuelto por `TenantResolutionMiddleware` (corre
 * para toda ruta salvo `/platform/*`). La usa el frontend para pintar el
 * acento de marca incluso antes de loguearse (login, etc.).
 */
@Controller('tenant')
@Public()
export class TenantPublicController {
  constructor(private readonly tenantRegistry: TenantRegistryService) {}

  @Get('public')
  async getPublicInfo() {
    const { subdomain } = getCurrentTenant();
    const tenant = await this.tenantRegistry.resolveByHost(subdomain);
    if (!tenant) {
      throw new NotFoundException('No se pudo resolver la institución actual');
    }

    return {
      name: tenant.name,
      primaryColor: tenant.primaryColor ?? DEFAULT_PRIMARY_COLOR,
      logoUrl: tenant.logoUrl,
    };
  }
}
