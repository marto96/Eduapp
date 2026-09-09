export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  tenantId: string;
  /** Solo presente en refresh tokens — identifica el token para poder revocarlo. */
  jti?: string;
  exp?: number;
  /**
   * Presente solo cuando este access token fue emitido por
   * `PlatformImpersonateTenantUserUseCase` — el `sub` (uuid) del superadmin
   * de plataforma que está impersonando a este usuario. Nunca se firma en
   * un login normal.
   */
  impersonatedBy?: string;
}
