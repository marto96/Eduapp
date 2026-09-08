import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PlatformAdminRepositoryPort } from '../ports/platform-admin.repository.port';
import { TotpService } from '../../infrastructure/totp.service';

/**
 * Confirma un alta de 2FA pendiente (`SetupPlatformAdminTotpUseCase`) —
 * recién acá `totpEnabled` pasa a `true`, una vez que el superadmin probó
 * que escaneó bien el QR con un código real.
 */
@Injectable()
export class ConfirmPlatformAdminTotpUseCase {
  constructor(
    @Inject(PlatformAdminRepositoryPort) private readonly admins: PlatformAdminRepositoryPort,
    private readonly totp: TotpService,
  ) {}

  async execute(adminId: string, code: string): Promise<void> {
    const admin = await this.admins.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Superadmin no encontrado');
    }

    const secret = admin.getTotpSecret();
    if (!secret) {
      throw new BadRequestException('No hay ningún alta de 2FA pendiente para confirmar');
    }

    if (!this.totp.verify(code, secret)) {
      throw new UnauthorizedException('Código inválido');
    }

    admin.confirmTotp();
    await this.admins.save(admin);
  }
}
