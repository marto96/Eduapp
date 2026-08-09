/**
 * Payload del JWT de superadmins de plataforma. Sin `tenantId` a propósito
 * (a diferencia de `JwtPayload`): un superadmin no pertenece a ningún
 * tenant, y este token nunca debe aceptarse en rutas de tenant ni viceversa
 * — por eso también usa un secret distinto (`PLATFORM_JWT_SECRET`).
 */
export interface PlatformJwtPayload {
  sub: string;
  email: string;
  scope: 'platform';
}
