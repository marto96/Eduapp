import { randomBytes } from 'node:crypto';

/**
 * Sin 0/O/1/I para que sea fácil de leer en voz alta o transcribir a mano.
 * 6 caracteres sobre un alfabeto de 32 ≈ mil millones de combinaciones —
 * junto con el rate limit del endpoint de creación, hace inviable una
 * fuerza bruta del código de otro aspirante.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export function generateTrackingCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `SOL-${chars.join('')}`;
}
