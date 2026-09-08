import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PlatformAdminRepositoryPort } from '../ports/platform-admin.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';
import { TotpService } from '../../infrastructure/totp.service';
import { PlatformJwtPayload, PlatformPendingTwoFactorJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

export interface VerifyPlatformAdminTotpInput {
  pendingToken: string;
  /** Un código TOTP de 6 dígitos, o uno de los códigos de recuperación (formato "XXXX-XXXX-XXXX"). */
  code: string;
}

export interface VerifyPlatformAdminTotpOutput {
  accessToken: string;
}

/**
 * Segundo paso del login cuando el superadmin tiene 2FA habilitado. Acepta
 * el código TOTP normal, o alternativamente un código de recuperación de
 * un solo uso (para cuando se perdió el celular/app) — en ese caso lo
 * consume de la lista para que no se pueda reusar.
 */
@Injectable()
export class VerifyPlatformAdminTotpUseCase {
  constructor(
    @Inject(PlatformAdminRepositoryPort) private readonly admins: PlatformAdminRepositoryPort,
    @Inject(PasswordHasherPort) private readonly hasher: PasswordHasherPort,
    private readonly totp: TotpService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: VerifyPlatformAdminTotpInput): Promise<VerifyPlatformAdminTotpOutput> {
    const secret = this.config.get<string>('PLATFORM_JWT_SECRET');

    let pendingPayload: PlatformPendingTwoFactorJwtPayload;
    try {
      pendingPayload = this.jwt.verify<PlatformPendingTwoFactorJwtPayload>(input.pendingToken, { secret });
    } catch {
      throw new UnauthorizedException('El código venció, volvé a iniciar sesión');
    }
    if (pendingPayload.scope !== 'platform-2fa-pending') {
      throw new UnauthorizedException('Token inválido para esta operación');
    }

    const admin = await this.admins.findById(pendingPayload.sub);
    if (!admin || admin.status !== 'active' || !admin.totpEnabled) {
      throw new UnauthorizedException('No se pudo verificar el código');
    }

    const totpSecret = admin.getTotpSecret()!;
    const validTotp = this.totp.verify(input.code, totpSecret);

    if (!validTotp) {
      const matchedHash = await this.findMatchingRecoveryCodeHash(admin.getRecoveryCodeHashes(), input.code);
      if (!matchedHash) {
        throw new UnauthorizedException('Código inválido');
      }
      admin.consumeRecoveryCodeHash(matchedHash);
      await this.admins.save(admin);
    }

    const payload: PlatformJwtPayload = { sub: admin.id, email: admin.email, scope: 'platform' };
    const accessToken = this.jwt.sign(payload, {
      secret,
      expiresIn: this.config.get<string>('PLATFORM_JWT_EXPIRES_IN'),
    });

    return { accessToken };
  }

  private async findMatchingRecoveryCodeHash(
    hashes: string[] | null,
    code: string,
  ): Promise<string | null> {
    for (const hash of hashes ?? []) {
      if (await this.hasher.compare(code, hash)) {
        return hash;
      }
    }
    return null;
  }
}
