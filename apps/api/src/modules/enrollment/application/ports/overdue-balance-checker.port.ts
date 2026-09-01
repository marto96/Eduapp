/**
 * Vive en `enrollment` aunque la implementación real necesita los
 * repositorios de `finance` (Charge/Payment) — quien consume el puerto lo
 * define, mismo patrón de inversión de dependencias que ya usa
 * `AudienceAccessService` (`communication`) con `EnrollmentRepositoryPort`.
 */
export abstract class OverdueBalanceCheckerPort {
  abstract hasOverdueBalance(enrollmentIds: string[]): Promise<boolean>;
}
