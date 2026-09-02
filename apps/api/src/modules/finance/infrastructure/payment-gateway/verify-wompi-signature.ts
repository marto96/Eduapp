import { createHash, timingSafeEqual } from 'node:crypto';

export interface WompiWebhookEnvelope {
  event?: string;
  data?: Record<string, unknown>;
  timestamp?: number;
  sent_at?: string;
  signature?: { properties?: string[]; checksum?: string };
}

function getByPath(source: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined),
      source,
    );
}

/**
 * Verifica la firma del webhook según el esquema documentado por Wompi:
 * `checksum = SHA256(<valores de signature.properties concatenados sin
 * separador, en orden> + <timestamp> + <event secret>)`, comparado contra
 * `signature.checksum` en el body (Wompi también lo manda en el header
 * `X-Event-Checksum`, redundante — no hace falta leerlo).
 *
 * Sin `WOMPI_EVENTS_SECRET` configurado (dev, sandbox) no se puede
 * verificar nada — se deja pasar sin chequeo, mismo criterio que el resto
 * de la app para secrets de dev.
 */
export function verifyWompiSignature(params: {
  secret: string | undefined;
  body: WompiWebhookEnvelope;
}): boolean {
  if (!params.secret) return true;

  const { signature, timestamp, data } = params.body;
  if (!signature?.checksum || !signature.properties?.length || timestamp === undefined || !data) {
    return false;
  }

  const concatenated = signature.properties.map((path) => String(getByPath(data, path) ?? '')).join('');
  const manifest = `${concatenated}${timestamp}${params.secret}`;
  const expected = createHash('sha256').update(manifest).digest('hex');

  // `timingSafeEqual` explota si los buffers difieren en largo — compararlo
  // antes evita esa excepción sin reintroducir una comparación de tiempo
  // variable para el caso más común (checksum manipulado del mismo largo).
  const expectedBuf = Buffer.from(expected.toLowerCase(), 'hex');
  const providedBuf = Buffer.from(signature.checksum.toLowerCase(), 'hex');
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}
