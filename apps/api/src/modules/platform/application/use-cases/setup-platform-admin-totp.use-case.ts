import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PlatformAdminRepositoryPort } from '../ports/platform-admin.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';
import { TotpService } from '../../infrastructure/totp.service';
import { generateRecoveryCodes } from '../../infrastructure/recovery-code.util';

export interface SetupTotpOutput {
  secret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
  /** En texto plano — se muestran una sola vez, nunca se pueden volver a consultar. */
  recoveryCodes: string[];
}

/**
 * Deja el secreto y los códigos de recuperación guardados como
 * "pendientes" (`totpEnabled` sigue en `false`) — `ConfirmPlatformAdminTotpUseCase`
 * recién habilita el 2FA una vez que el superadmin prueba que escaneó bien
 * el QR, para no dejarlo afuera de su propia cuenta.
 */
@Injectable()
export class SetupPlatformAdminTotpUseCase {
  constructor(
    @Inject(PlatformAdminRepositoryPort) private readonly admins: PlatformAdminRepositoryPort,
    private readonly totp: TotpService,
    @Inject(PasswordHasherPort) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(adminId: string): Promise<SetupTotpOutput> {
    const admin = await this.admins.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Superadmin no encontrado');
    }

    const secret = this.totp.generateSecret();
    const recoveryCodes = generateRecoveryCodes();
    const recoveryCodeHashes = await Promise.all(recoveryCodes.map((code) => this.hasher.hash(code)));

    admin.startTotpSetup(secret, recoveryCodeHashes);
    await this.admins.save(admin);

    const otpauthUri = this.totp.generateUri(admin.email, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

    return { secret, otpauthUri, qrCodeDataUrl, recoveryCodes };
  }
}
