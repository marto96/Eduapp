import { createHash } from 'crypto';

/**
 * Sin auth de usuario a propósito — esta página no tiene enlace visible y
 * solo la usa el equipo comercial. La contraseña vive en env, nunca en el
 * bundle del cliente (este módulo solo se importa desde Server
 * Components/Server Actions).
 */
export const MODELO_2027_PASSWORD = process.env.MODELO_2027_PASSWORD ?? 'skolaria2027';
export const MODELO_2027_COOKIE = 'modelo2027_unlocked';

export function expectedToken(): string {
  return createHash('sha256').update(`${MODELO_2027_PASSWORD}::modelo-2027-gate`).digest('hex');
}
