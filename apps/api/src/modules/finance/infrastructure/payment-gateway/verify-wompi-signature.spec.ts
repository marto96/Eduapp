import { createHash } from 'node:crypto';
import { verifyWompiSignature, WompiWebhookEnvelope } from './verify-wompi-signature';

function sign(secret: string, concatenatedProperties: string, timestamp: number): string {
  return createHash('sha256').update(`${concatenatedProperties}${timestamp}${secret}`).digest('hex');
}

function buildEnvelope(overrides: Partial<WompiWebhookEnvelope> = {}): WompiWebhookEnvelope {
  return {
    event: 'transaction.updated',
    data: { transaction: { id: 'txn-1', status: 'APPROVED', amount_in_cents: 4490000 } },
    timestamp: 1700000000,
    signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum: '' },
    ...overrides,
  };
}

describe('verifyWompiSignature', () => {
  const secret = 'test_events_secret';

  it('deja pasar sin secret configurado (dev/sandbox)', () => {
    expect(verifyWompiSignature({ secret: undefined, body: buildEnvelope() })).toBe(true);
  });

  it('rechaza si falta el checksum, las properties o el timestamp con secret configurado', () => {
    expect(
      verifyWompiSignature({ secret, body: buildEnvelope({ signature: undefined }) }),
    ).toBe(false);
    expect(
      verifyWompiSignature({
        secret,
        body: buildEnvelope({ signature: { properties: [], checksum: 'abc' } }),
      }),
    ).toBe(false);
    expect(
      verifyWompiSignature({ secret, body: buildEnvelope({ timestamp: undefined }) }),
    ).toBe(false);
  });

  it('acepta un checksum válido: concatenación de las properties + timestamp + secret, SHA256', () => {
    const concatenated = 'txn-1APPROVED4490000';
    const checksum = sign(secret, concatenated, 1700000000);

    const result = verifyWompiSignature({
      secret,
      body: buildEnvelope({ signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum } }),
    });

    expect(result).toBe(true);
  });

  it('acepta el checksum sin importar mayúsculas/minúsculas', () => {
    const concatenated = 'txn-1APPROVED4490000';
    const checksum = sign(secret, concatenated, 1700000000).toUpperCase();

    const result = verifyWompiSignature({
      secret,
      body: buildEnvelope({ signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum } }),
    });

    expect(result).toBe(true);
  });

  it('rechaza un checksum con contenido incorrecto (mismo largo)', () => {
    const concatenated = 'txn-1APPROVED4490000';
    const checksum = sign(secret, concatenated, 1700000000);
    const tampered = (checksum[0] === '0' ? '1' : '0') + checksum.slice(1);

    const result = verifyWompiSignature({
      secret,
      body: buildEnvelope({ signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum: tampered } }),
    });

    expect(result).toBe(false);
  });

  it('rechaza sin explotar un checksum de largo distinto al esperado', () => {
    const result = verifyWompiSignature({
      secret,
      body: buildEnvelope({ signature: { properties: ['transaction.id'], checksum: 'deadbeef' } }),
    });

    expect(result).toBe(false);
  });

  it('resuelve valores anidados por dotted path aunque falten (los trata como string vacío)', () => {
    const concatenated = '';
    const checksum = sign(secret, concatenated, 1700000000);

    const result = verifyWompiSignature({
      secret,
      body: buildEnvelope({ signature: { properties: ['transaction.nonexistent'], checksum } }),
    });

    expect(result).toBe(true);
  });
});
