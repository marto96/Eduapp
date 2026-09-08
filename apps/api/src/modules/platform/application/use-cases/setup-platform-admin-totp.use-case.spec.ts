import { NotFoundException } from '@nestjs/common';
import { SetupPlatformAdminTotpUseCase } from './setup-platform-admin-totp.use-case';
import { PlatformAdminRepositoryPort } from '../ports/platform-admin.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';
import { TotpService } from '../../infrastructure/totp.service';
import { PlatformAdmin } from '../../domain/entities/platform-admin.entity';

describe('SetupPlatformAdminTotpUseCase', () => {
  const admins: jest.Mocked<PlatformAdminRepositoryPort> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const hasher: jest.Mocked<PasswordHasherPort> = { hash: jest.fn(), compare: jest.fn() };
  const totp = { generateSecret: jest.fn(), generateUri: jest.fn(), verify: jest.fn() } as unknown as jest.Mocked<TotpService>;

  const useCase = new SetupPlatformAdminTotpUseCase(admins, totp, hasher);

  beforeEach(() => {
    jest.clearAllMocks();
    admins.findById.mockResolvedValue(new PlatformAdmin('admin-1', 'a@a.com', 'hash', 'Admin', 'active'));
    totp.generateSecret.mockReturnValue('SECRETBASE32');
    totp.generateUri.mockReturnValue('otpauth://totp/Skolaria:a@a.com?secret=SECRETBASE32&issuer=Skolaria');
    hasher.hash.mockImplementation(async (plain) => `hashed(${plain})`);
  });

  it('rechaza si el superadmin no existe', async () => {
    admins.findById.mockResolvedValue(null);
    await expect(useCase.execute('admin-x')).rejects.toThrow(NotFoundException);
  });

  it('genera un secreto, 10 códigos de recuperación, y los guarda como pendientes', async () => {
    const result = await useCase.execute('admin-1');

    expect(result.secret).toBe('SECRETBASE32');
    expect(result.otpauthUri).toContain('SECRETBASE32');
    expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.recoveryCodes).toHaveLength(10);
    // Formato "XXXX-XXXX-XXXX"
    expect(result.recoveryCodes[0]).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);

    expect(admins.save).toHaveBeenCalledTimes(1);
    const savedAdmin = admins.save.mock.calls[0][0];
    expect(savedAdmin.getTotpSecret()).toBe('SECRETBASE32');
    expect(savedAdmin.totpEnabled).toBe(false);
    expect(savedAdmin.getRecoveryCodeHashes()).toHaveLength(10);
  });
});
