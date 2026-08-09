import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { TokenIssuerPort, TokenPair } from '../ports/token-issuer.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { getCurrentTenant } from '../../../../core/tenant/tenant-context';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    @Inject(TokenIssuerPort) private readonly tokens: TokenIssuerPort,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // El endpoint es @Public() (no pasa por JwtStrategy), así que el chequeo
    // cross-tenant hay que hacerlo acá a mano.
    if (payload.tenantId !== getCurrentTenant().tenantId) {
      throw new UnauthorizedException('El token no corresponde a esta institución');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    return this.tokens.issueTokenPair(user);
  }
}
