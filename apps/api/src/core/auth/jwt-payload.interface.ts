export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  tenantId: string;
  /** Solo presente en refresh tokens — identifica el token para poder revocarlo. */
  jti?: string;
  exp?: number;
}
