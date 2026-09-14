import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantBranding, TenantBrandingPort } from '../application/ports/tenant-branding.port';
import { TenantRegistryService } from '../../../core/tenant/tenant-registry.service';
import { getCurrentTenant } from '../../../core/tenant/tenant-context';

/**
 * Resuelve el nombre/logo del tenant de la request actual — mismo
 * mecanismo (cacheado en Redis) que ya usa `TenantPublicController` para
 * el endpoint de branding del login.
 */
@Injectable()
export class TenantContextBrandingAdapter extends TenantBrandingPort {
  constructor(private readonly tenantRegistry: TenantRegistryService) {
    super();
  }

  async getCurrentBranding(): Promise<TenantBranding> {
    const { subdomain } = getCurrentTenant();
    const tenant = await this.tenantRegistry.resolveByHost(subdomain);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${subdomain}"`);
    }
    return { name: tenant.name, logoUrl: tenant.logoUrl };
  }
}
