export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  tenantId: string;
}
