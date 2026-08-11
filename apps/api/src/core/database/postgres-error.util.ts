/**
 * SQLSTATE de Postgres para violación de un constraint `EXCLUDE`. `pg`
 * expone el código en `.code` sobre el error crudo del driver.
 */
const EXCLUSION_VIOLATION = '23P01';

export function isExclusionViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === EXCLUSION_VIOLATION;
}
