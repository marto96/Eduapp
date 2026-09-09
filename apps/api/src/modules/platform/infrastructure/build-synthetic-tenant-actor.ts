import { JwtPayload } from '../../../core/auth/jwt-payload.interface';
import { PlatformJwtPayload } from '../../../core/auth/platform-jwt-payload.interface';

/**
 * Identidad en memoria para satisfacer el chequeo de rol interno de
 * `EditUserUseCase`/`DeactivateUserUseCase`/`ReactivateUserUseCase` —
 * nunca se firma como JWT real, nunca se persiste, nunca sale del
 * servidor. El prefijo `platform-admin:` en `sub` es intencional: si
 * alguna vez aparece en un log, queda claro que no es un usuario real
 * de ese tenant.
 */
export function buildSyntheticTenantActor(platformAdmin: PlatformJwtPayload, schemaName: string): JwtPayload {
  return {
    sub: `platform-admin:${platformAdmin.sub}`,
    email: platformAdmin.email,
    roles: ['admin_institucion'],
    tenantId: schemaName,
  };
}
