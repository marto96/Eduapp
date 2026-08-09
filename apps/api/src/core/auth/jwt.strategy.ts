import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt-payload.interface';
import { getCurrentTenant } from '../tenant/tenant-context';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Se ejecuta dentro del `AsyncLocalStorage` publicado por
   * `TenantResolutionMiddleware` (los guards corren dentro de la misma
   * cadena de request), así que `getCurrentTenant()` ya está disponible acá.
   *
   * Protección explícita contra "cross-tenant token replay" (ARCHITECTURE.md
   * §3): un access token emitido para el tenant A no sirve contra el host/
   * header que resuelve al tenant B, aunque la firma sea válida.
   */
  validate(payload: JwtPayload): JwtPayload {
    const currentTenant = getCurrentTenant();
    if (payload.tenantId !== currentTenant.tenantId) {
      throw new UnauthorizedException('El token no corresponde a esta institución');
    }
    return payload;
  }
}
