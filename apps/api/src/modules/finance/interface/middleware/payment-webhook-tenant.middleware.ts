import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantRegistryService } from '../../../../core/tenant/tenant-registry.service';
import { tenantAsyncStorage } from '../../../../core/tenant/tenant-context';
import { parseWompiReference } from '../../infrastructure/payment-gateway/wompi-reference';

/**
 * Análogo a `TenantResolutionMiddleware`, pero solo para `POST
 * /finance/payments/webhook` y `POST /admissions/webhooks/payment` — a esas
 * rutas las llama Wompi directo, no nuestro frontend, así que no llegan con
 * el Host de ningún tenant ni con el header `x-tenant-subdomain` de
 * desarrollo. A diferencia de MercadoPago, Wompi tampoco permite una URL de
 * notificación distinta por transacción (la URL de eventos se configura
 * una sola vez en el dashboard del comercio) — así que el tenant viaja
 * codificado en la `reference` de la transacción en vez de en un query
 * param (ver `WompiPaymentGateway`, que la arma).
 */
@Injectable()
export class PaymentWebhookTenantMiddleware implements NestMiddleware {
  constructor(private readonly registry: TenantRegistryService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const reference = req.body?.data?.transaction?.reference;
    const parsed = typeof reference === 'string' ? parseWompiReference(reference) : null;
    if (!parsed) {
      throw new NotFoundException('No se pudo determinar la institución de la notificación');
    }

    const tenant = await this.registry.resolveByHost(parsed.subdomain);
    if (!tenant) {
      throw new NotFoundException(`No existe una institución para "${parsed.subdomain}"`);
    }

    tenantAsyncStorage.run(
      { tenantId: tenant.id, schemaName: tenant.schemaName, subdomain: tenant.subdomain },
      () => next(),
    );
  }
}
