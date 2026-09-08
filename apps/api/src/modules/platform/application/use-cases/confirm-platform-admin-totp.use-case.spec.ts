import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfirmPlatformAdminTotpUseCase } from './confirm-platform-admin-totp.use-case';
import { PlatformAdminRepositoryPort } from '../ports/platform-admin.repository.port';
import { TotpService } from '../../infrastructure/totp.service';
import { PlatformAdmin } from '../../domain/entities/platform-admin.entity';

describe('ConfirmPlatformAdminTotpUseCase', () => {
  const admins: jest.Mocked<PlatformAdminRepositoryPort> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const totp = { generateSecret: jest.fn(), generateUri: jest.fn(), verify: jest.fn() } as unknown as jest.Mocked<TotpService>;

  const useCase = new ConfirmPlatformAdminTotpUseCase(admins, totp);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si el superadmin no existe', async () => {
    admins.findById.mockResolvedValue(null);
    await expect(useCase.execute('admin-x', '123456')).rejects.toThrow(NotFoundException);
  });

  it('rechaza si no hay ningún alta de 2FA pendiente', async () => {
    admins.findById.mockResolvedValue(new PlatformAdmin('admin-1', 'a@a.com', 'hash', 'Admin', 'active'));
    await expect(useCase.execute('admin-1', '123456')).rejects.toThrow(BadRequestException);
  });

  it('rechaza si el código no es válido', async () => {
    admins.findById.mockResolvedValue(
      new PlatformAdmin('admin-1', 'a@a.com', 'hash', 'Admin', 'active', 'SECRET123', false, ['h1']),
    );
    totp.verify.mockReturnValue(false);

    await expect(useCase.execute('admin-1', '000000')).rejects.toThrow(UnauthorizedException);
    expect(admins.save).not.toHaveBeenCalled();
  });

  it('habilita 2FA cuando el código es válido', async () => {
    const admin = new PlatformAdmin('admin-1', 'a@a.com', 'hash', 'Admin', 'active', 'SECRET123', false, ['h1']);
    admins.findById.mockResolvedValue(admin);
    totp.verify.mockReturnValue(true);

    await useCase.execute('admin-1', '654321');

    expect(totp.verify).toHaveBeenCalledWith('654321', 'SECRET123');
    expect(admin.totpEnabled).toBe(true);
    expect(admins.save).toHaveBeenCalledWith(admin);
  });
});
