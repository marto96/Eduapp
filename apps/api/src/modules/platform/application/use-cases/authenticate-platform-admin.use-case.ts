import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PlatformAdminRepositoryPort } from '../ports/platform-admin.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';
import { PlatformJwtPayload, PlatformPendingTwoFactorJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

const PENDING_TWO_FACTOR_EXPIRES_IN = '5m';

export interface AuthenticatePlatformAdminInput {
  email: string;
  password: string;
}

export interface AuthenticatePlatformAdminOutput {
  /** Presente cuando el superadmin no tiene 2FA habilitado — login completo. */
  accessToken?: string;
  /** Presente cuando sí tiene 2FA habilitado — falta `POST /platform/auth/login/verify-2fa`. */
  pendingTwoFactorToken?: string;
}

@Injectable()
export class AuthenticatePlatformAdminUseCase {
  constructor(
    @Inject(PlatformAdminRepositoryPort) private readonly admins: PlatformAdminRepositoryPort,
    @Inject(PasswordHasherPort) private readonly hasher: PasswordHasherPort,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: AuthenticatePlatformAdminInput): Promise<AuthenticatePlatformAdminOutput> {
    const admin = await this.admins.findByEmail(input.email);
    if (!admin || admin.status !== 'active') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await this.hasher.compare(input.password, admin.getPasswordHash());
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const secret = this.config.get<string>('PLATFORM_JWT_SECRET');

    if (admin.totpEnabled) {
      const pendingPayload: PlatformPendingTwoFactorJwtPayload = {
        sub: admin.id,
        scope: 'platform-2fa-pending',
      };
      const pendingTwoFactorToken = this.jwt.sign(pendingPayload, {
        secret,
        expiresIn: PENDING_TWO_FACTOR_EXPIRES_IN,
      });
      return { pendingTwoFactorToken };
    }

    const payload: PlatformJwtPayload = { sub: admin.id, email: admin.email, scope: 'platform' };
    const accessToken = this.jwt.sign(payload, {
      secret,
      expiresIn: this.config.get<string>('PLATFORM_JWT_EXPIRES_IN'),
    });

    return { accessToken };
  }
}
