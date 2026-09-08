import { randomBytes } from 'node:crypto';

const RECOVERY_CODE_COUNT = 10;

function generateOneRecoveryCode(): string {
  const raw = randomBytes(6).toString('hex').toUpperCase(); // 12 caracteres hex
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

/** 10 códigos de un solo uso, formato "A1B2-C3D4-E5F6" — se muestran una sola vez al configurar 2FA. */
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, generateOneRecoveryCode);
}
