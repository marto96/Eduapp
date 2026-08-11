import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.module';
import { TenantRepositoryPort } from '../../modules/platform/application/ports/tenant.repository.port';

export interface TenantRecord {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  schemaName: string;
  status: 'active' | 'suspended';
  enabledModules: string[];
  primaryColor: string | null;
}

const CACHE_TTL_SECONDS = 60;

/**
 * Resuelve tenants por host (o subdominio explícito, ver
 * TenantResolutionMiddleware) consultando el schema `public` (tabla
 * `tenants`), con cache en Redis para no pagar esa consulta en cada request.
 */
@Injectable()
export class TenantRegistryService {
  constructor(
    @Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async resolveByHost(host: string): Promise<TenantRecord | null> {
    const lookupKey = this.extractLookupKey(host);
    if (!lookupKey) return null;

    const cacheKey = `tenant:by-subdomain:${lookupKey}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as TenantRecord;

    const tenant =
      (await this.tenants.findBySubdomain(lookupKey)) ??
      (await this.tenants.findByCustomDomain(host));
    if (!tenant) return null;

    const record: TenantRecord = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      schemaName: tenant.schemaName,
      status: tenant.status,
      enabledModules: tenant.enabledModules,
      primaryColor: tenant.primaryColor,
    };

    await this.redis.set(cacheKey, JSON.stringify(record), 'EX', CACHE_TTL_SECONDS);
    return record;
  }

  /**
   * `host` puede ser un subdominio (`colegio-abc.eduapp.com` → `colegio-abc`)
   * o, si viene del header de override de desarrollo, ya el subdominio
   * directo. `localhost`, IPs y hosts sin punto no tienen subdominio.
   */
  private extractLookupKey(host: string): string | null {
    const hostname = host.split(':')[0];
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return null;
    }
    const [firstLabel, ...rest] = hostname.split('.');
    return rest.length > 0 ? firstLabel : hostname;
  }
}
