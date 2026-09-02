const SEPARATOR = '__';

/**
 * Wompi no permite un `notification_url` por transacción como MercadoPago
 * (la URL de eventos se configura una sola vez en el dashboard del
 * comercio) — así que el tenant viaja codificado en la `reference` que le
 * mandamos a Wompi en vez de en el webhook URL. Un UUID nunca contiene
 * `__`, así que buscar la primera ocurrencia es inambiguo.
 */
export function buildWompiReference(subdomain: string, externalReference: string): string {
  return `${subdomain}${SEPARATOR}${externalReference}`;
}

export function parseWompiReference(
  reference: string,
): { subdomain: string; externalReference: string } | null {
  const index = reference.indexOf(SEPARATOR);
  if (index === -1) return null;

  return {
    subdomain: reference.slice(0, index),
    externalReference: reference.slice(index + SEPARATOR.length),
  };
}
