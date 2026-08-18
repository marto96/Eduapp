import { createHmac } from 'node:crypto';
import { verifyMercadoPagoSignature } from './verify-mercadopago-signature';

function signManifest(secret: string, dataId: string, requestId: string, ts: string): string {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  return createHmac('sha256', secret).update(manifest).digest('hex');
}

describe('verifyMercadoPagoSignature', () => {
  const secret = 'a-real-webhook-secret';
  const dataId = 'PAY-123';
  const xRequestId = 'req-1';
  const ts = '1700000000';

  it('deja pasar sin secret configurado (dev/sandbox)', () => {
    const result = verifyMercadoPagoSignature({
      secret: undefined,
      xSignature: undefined,
      xRequestId: undefined,
      dataId,
    });

    expect(result).toBe(true);
  });

  it('rechaza si falta x-signature o x-request-id con secret configurado', () => {
    expect(
      verifyMercadoPagoSignature({ secret, xSignature: undefined, xRequestId, dataId }),
    ).toBe(false);
    expect(
      verifyMercadoPagoSignature({ secret, xSignature: `ts=${ts},v1=abc`, xRequestId: undefined, dataId }),
    ).toBe(false);
  });

  it('acepta una firma HMAC-SHA256 válida', () => {
    const hash = signManifest(secret, dataId, xRequestId, ts);

    const result = verifyMercadoPagoSignature({
      secret,
      xSignature: `ts=${ts},v1=${hash}`,
      xRequestId,
      dataId,
    });

    expect(result).toBe(true);
  });

  it('rechaza una firma con contenido incorrecto (mismo largo)', () => {
    const hash = signManifest(secret, dataId, xRequestId, ts);
    const tampered = '0' + hash.slice(1); // mismo largo, contenido distinto

    const result = verifyMercadoPagoSignature({
      secret,
      xSignature: `ts=${ts},v1=${tampered}`,
      xRequestId,
      dataId,
    });

    expect(result).toBe(false);
  });

  it('rechaza sin explotar una firma de largo distinto al esperado', () => {
    const result = verifyMercadoPagoSignature({
      secret,
      xSignature: `ts=${ts},v1=deadbeef`,
      xRequestId,
      dataId,
    });

    expect(result).toBe(false);
  });
});
