import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

/**
 * Valida el Bearer token de un superadmin de plataforma: verificación
 * manual (mismo patrón que `RefreshTokenUseCase` en identity) contra
 * `PLATFORM_JWT_SECRET`, un secret propio y distinto del de los tenants —
 * un access token de tenant no sirve acá aunque la firma fuera válida,
 * porque está firmado con otro secret.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

    if (!token) {
      throw new UnauthorizedException('Falta el token de administración de plataforma');
    }

    let payload: PlatformJwtPayload;
    try {
      payload = this.jwt.verify<PlatformJwtPayload>(token, {
        secret: this.config.get<string>('PLATFORM_JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token de administración de plataforma inválido o expirado');
    }

    if (payload.scope !== 'platform') {
      throw new UnauthorizedException('Token inválido para esta operación');
    }

    request.platformAdmin = payload;
    return true;
  }
}
