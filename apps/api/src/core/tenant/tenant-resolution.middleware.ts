import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { TenantRegistryService } from './tenant-registry.service';
import { tenantAsyncStorage } from './tenant-context';

/**
 * Resuelve el tenant a partir del host de la request (subdominio o dominio
 * propio), y publica el contexto (tenantId, schemaName) para el resto de la
 * cadena de ejecución. No consulta la base "public" en cada request: usa
 * TenantRegistryService, que cachea en Redis.
 */
@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  constructor(
    private readonly registry: TenantRegistryService,
    private readonly config: ConfigService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const headerOverrideEnabled = this.config.get<boolean>('TENANT_HEADER_OVERRIDE_ENABLED');
    const headerSubdomain = req.header('x-tenant-subdomain');

    // Solo en desarrollo/staging: permite probar multitenancy sin subdominios
    // locales reales. En producción el flag está apagado y este header,
    // aunque venga en la request, se ignora — evita que un cliente lo use
    // para intentar acceder a otro tenant.
    const lookupHost = headerOverrideEnabled && headerSubdomain ? headerSubdomain : req.hostname;

    const tenant = await this.registry.resolveByHost(lookupHost);

    if (!tenant) {
      throw new NotFoundException(`No existe una institución para "${lookupHost}"`);
    }

    tenantAsyncStorage.run(
      {
        tenantId: tenant.id,
        schemaName: tenant.schemaName,
        subdomain: tenant.subdomain,
      },
      () => next(),
    );
  }
}
