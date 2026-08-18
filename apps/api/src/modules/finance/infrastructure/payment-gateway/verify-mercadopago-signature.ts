import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifica la firma del webhook según el esquema documentado por
 * MercadoPago: header `x-signature: ts=<ts>,v1=<hash>` +
 * `x-request-id`, HMAC-SHA256 sobre `id:<dataId>;request-id:<requestId>;ts:<ts>;`
 * con el secret configurado en el panel de MercadoPago.
 *
 * Sin `MERCADOPAGO_WEBHOOK_SECRET` configurado (dev, sandbox) no se puede
 * verificar nada — se deja pasar sin chequeo, mismo criterio que el resto
 * de la app para secrets de dev ("change_me_..._dev_only").
 */
export function verifyMercadoPagoSignature(params: {
  secret: string | undefined;
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string;
}): boolean {
  if (!params.secret) return true;
  if (!params.xSignature || !params.xRequestId) return false;

  const parts = Object.fromEntries(
    params.xSignature.split(',').map((part) => part.trim().split('=') as [string, string]),
  );
  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.xRequestId};ts:${ts};`;
  const expected = createHmac('sha256', params.secret).update(manifest).digest('hex');

  // `timingSafeEqual` explota si los buffers difieren en largo — compararlo
  // antes evita esa excepción sin reintroducir una comparación de tiempo
  // variable para el caso más común (firma manipulada del mismo largo).
  const expectedBuf = Buffer.from(expected, 'hex');
  const hashBuf = Buffer.from(hash, 'hex');
  if (expectedBuf.length !== hashBuf.length) return false;
  return timingSafeEqual(expectedBuf, hashBuf);
}
