/**
 * SQLSTATE de Postgres para violación de un constraint `EXCLUDE`. `pg`
 * expone el código en `.code` sobre el error crudo del driver.
 */
const EXCLUSION_VIOLATION = '23P01';

export function isExclusionViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === EXCLUSION_VIOLATION;
}

/**
 * SQLSTATE de Postgres para violación de un `UNIQUE INDEX`/constraint
 * simple — a diferencia de `isExclusionViolation` (23P01, para `EXCLUDE`
 * de rangos), esto cubre los índices únicos parciales usados como
 * backstop de "no se puede repetir X" (ver charges/fee_schedules).
 */
const UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === UNIQUE_VIOLATION;
}
