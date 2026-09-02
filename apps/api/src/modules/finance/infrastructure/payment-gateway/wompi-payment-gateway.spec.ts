import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { WompiPaymentGateway } from './wompi-payment-gateway';
import { tenantAsyncStorage } from '../../../../core/tenant/tenant-context';

function configFor(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function withTenant<T>(subdomain: string, fn: () => T): T {
  return tenantAsyncStorage.run({ tenantId: 't-1', schemaName: 'tenant_x', subdomain }, fn);
}

describe('WompiPaymentGateway', () => {
  describe('createCheckoutPreference', () => {
    it('arma la URL de checkout con la referencia prefijada por tenant y la firma de integridad correcta', async () => {
      const gateway = new WompiPaymentGateway(
        configFor({
          WOMPI_PUBLIC_KEY: 'pub_test_abc',
          WOMPI_INTEGRITY_SECRET: 'test_integrity_secret',
          WEB_PUBLIC_URL: 'http://localhost:3000',
        }),
      );

      const result = await withTenant('colegio-demo', () =>
        gateway.createCheckoutPreference({
          externalReference: 'attempt-1',
          payerEmail: 'a@b.com',
          item: { title: 'Cuota', amount: 150000 },
          webhookPath: 'finance/payments/webhook',
          successPath: 'portal/payment-success',
          failurePath: 'portal/payment-failure',
        }),
      );

      const url = new URL(result.checkoutUrl);
      expect(url.origin + url.pathname).toBe('https://checkout.wompi.co/p/');
      expect(url.searchParams.get('public-key')).toBe('pub_test_abc');
      expect(url.searchParams.get('currency')).toBe('COP');
      expect(url.searchParams.get('amount-in-cents')).toBe('15000000');
      expect(url.searchParams.get('reference')).toBe('colegio-demo__attempt-1');
      expect(url.searchParams.get('redirect-url')).toBe('http://localhost:3000/portal/payment-success');
      expect(result.preferenceId).toBe('colegio-demo__attempt-1');

      const expectedIntegrity = createHash('sha256')
        .update('colegio-demo__attempt-115000000COPtest_integrity_secret')
        .digest('hex');
      expect(url.searchParams.get('signature:integrity')).toBe(expectedIntegrity);
    });
  });

  describe('getPaymentInfo', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('consulta el host de sandbox con una llave pub_test_ y desarma la referencia', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { status: 'APPROVED', payment_method_type: 'NEQUI', reference: 'colegio-demo__attempt-1' },
        }),
      } as Response);

      const gateway = new WompiPaymentGateway(configFor({ WOMPI_PUBLIC_KEY: 'pub_test_abc' }));
      const info = await gateway.getPaymentInfo('txn-1');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://sandbox.wompi.co/v1/transactions/txn-1',
        expect.objectContaining({ headers: { Authorization: 'Bearer pub_test_abc' } }),
      );
      expect(info).toEqual({ status: 'approved', paymentMethodId: 'NEQUI', externalReference: 'attempt-1' });
    });

    it('consulta el host de producción con una llave pub_prod_', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { status: 'PENDING', payment_method_type: 'CARD', reference: 'colegio-demo__attempt-2' },
        }),
      } as Response);

      const gateway = new WompiPaymentGateway(configFor({ WOMPI_PUBLIC_KEY: 'pub_prod_xyz' }));
      await gateway.getPaymentInfo('txn-2');

      expect(fetch).toHaveBeenCalledWith(
        'https://production.wompi.co/v1/transactions/txn-2',
        expect.anything(),
      );
    });

    it.each(['DECLINED', 'VOIDED', 'ERROR'])('mapea el estado %s a rejected', async (status) => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { status, payment_method_type: 'CARD', reference: 'colegio-demo__attempt-1' },
        }),
      } as Response);

      const gateway = new WompiPaymentGateway(configFor({ WOMPI_PUBLIC_KEY: 'pub_test_abc' }));
      const info = await gateway.getPaymentInfo('txn-1');

      expect(info.status).toBe('rejected');
    });

    it('lanza un error si Wompi responde con un status no exitoso', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 404 } as Response);

      const gateway = new WompiPaymentGateway(configFor({ WOMPI_PUBLIC_KEY: 'pub_test_abc' }));

      await expect(gateway.getPaymentInfo('txn-inexistente')).rejects.toThrow();
    });
  });
});
