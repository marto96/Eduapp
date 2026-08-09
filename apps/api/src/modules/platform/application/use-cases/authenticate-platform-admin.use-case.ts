import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PlatformAdminRepositoryPort } from '../ports/platform-admin.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

export interface AuthenticatePlatformAdminInput {
  email: string;
  password: string;
}

export interface AuthenticatePlatformAdminOutput {
  accessToken: string;
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

    const payload: PlatformJwtPayload = { sub: admin.id, email: admin.email, scope: 'platform' };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('PLATFORM_JWT_SECRET'),
      expiresIn: this.config.get<string>('PLATFORM_JWT_EXPIRES_IN'),
    });

    return { accessToken };
  }
}
