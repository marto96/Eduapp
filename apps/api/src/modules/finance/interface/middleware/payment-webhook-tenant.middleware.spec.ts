import { NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentWebhookTenantMiddleware } from './payment-webhook-tenant.middleware';
import { TenantRegistryService } from '../../../../core/tenant/tenant-registry.service';
import { tenantAsyncStorage } from '../../../../core/tenant/tenant-context';

function bodyWithReference(reference: unknown) {
  return { data: { transaction: { reference } } } as unknown as Request['body'];
}

describe('PaymentWebhookTenantMiddleware', () => {
  const tenant = { id: 't-1', schemaName: 'tenant_colegio_demo', subdomain: 'colegio-demo' };

  function middlewareWithRegistry(resolveByHost: jest.Mock): PaymentWebhookTenantMiddleware {
    return new PaymentWebhookTenantMiddleware({ resolveByHost } as unknown as TenantRegistryService);
  }

  it('resuelve el tenant a partir de la referencia de la transacción en el body', async () => {
    const resolveByHost = jest.fn().mockResolvedValue(tenant);
    const middleware = middlewareWithRegistry(resolveByHost);
    const req = { body: bodyWithReference('colegio-demo__attempt-1') } as Request;
    const next = jest.fn(() => {
      expect(tenantAsyncStorage.getStore()).toEqual({
        tenantId: tenant.id,
        schemaName: tenant.schemaName,
        subdomain: tenant.subdomain,
      });
    });

    await middleware.use(req, {} as Response, next);

    expect(resolveByHost).toHaveBeenCalledWith('colegio-demo');
    expect(next).toHaveBeenCalled();
  });

  it('rechaza si la referencia no tiene el formato esperado', async () => {
    const middleware = middlewareWithRegistry(jest.fn());
    const req = { body: bodyWithReference('sin-separador') } as Request;

    await expect(middleware.use(req, {} as Response, jest.fn())).rejects.toThrow(NotFoundException);
  });

  it('rechaza si no existe una institución para el subdominio de la referencia', async () => {
    const middleware = middlewareWithRegistry(jest.fn().mockResolvedValue(null));
    const req = { body: bodyWithReference('inexistente__attempt-1') } as Request;

    await expect(middleware.use(req, {} as Response, jest.fn())).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el body no trae la referencia', async () => {
    const middleware = middlewareWithRegistry(jest.fn());
    const req = { body: {} } as Request;

    await expect(middleware.use(req, {} as Response, jest.fn())).rejects.toThrow(NotFoundException);
  });
});
