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

/**
 * Token intermedio emitido tras validar contraseña, cuando el superadmin
 * tiene 2FA habilitado — de vida corta (5 min) y con un `scope` distinto
 * que solo sirve para `POST /platform/auth/login/verify-2fa`, nunca para
 * ninguna ruta protegida por `PlatformAdminGuard`.
 */
export interface PlatformPendingTwoFactorJwtPayload {
  sub: string;
  scope: 'platform-2fa-pending';
}
