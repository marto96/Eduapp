import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantRegistryService } from '../../../../core/tenant/tenant-registry.service';
import { tenantAsyncStorage } from '../../../../core/tenant/tenant-context';

/**
 * Análogo a `TenantResolutionMiddleware`, pero solo para `POST
 * /finance/payments/webhook` — a esa ruta la llama MercadoPago directo, no
 * nuestro frontend, así que no llega con el Host de ningún tenant ni con
 * el header `x-tenant-subdomain` de desarrollo. En su lugar, el tenant
 * viaja como query param `?tenant=<subdomain>`, agregado a mano al
 * `notification_url` cuando se crea la preferencia (ver
 * `MercadoPagoPaymentGateway`).
 */
@Injectable()
export class PaymentWebhookTenantMiddleware implements NestMiddleware {
  constructor(private readonly registry: TenantRegistryService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const subdomain = req.query.tenant;
    if (typeof subdomain !== 'string') {
      throw new NotFoundException('Falta el parámetro "tenant" en la notificación');
    }

    const tenant = await this.registry.resolveByHost(subdomain);
    if (!tenant) {
      throw new NotFoundException(`No existe una institución para "${subdomain}"`);
    }

    tenantAsyncStorage.run(
      { tenantId: tenant.id, schemaName: tenant.schemaName, subdomain: tenant.subdomain },
      () => next(),
    );
  }
}
