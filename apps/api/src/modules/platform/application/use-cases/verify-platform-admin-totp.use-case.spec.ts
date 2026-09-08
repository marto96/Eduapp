import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { VerifyPlatformAdminTotpUseCase } from './verify-platform-admin-totp.use-case';
import { PlatformAdminRepositoryPort } from '../ports/platform-admin.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';
import { TotpService } from '../../infrastructure/totp.service';
import { PlatformAdmin } from '../../domain/entities/platform-admin.entity';
import { PlatformPendingTwoFactorJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

describe('VerifyPlatformAdminTotpUseCase', () => {
  const admins: jest.Mocked<PlatformAdminRepositoryPort> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const hasher: jest.Mocked<PasswordHasherPort> = { hash: jest.fn(), compare: jest.fn() };
  const totp = { generateSecret: jest.fn(), generateUri: jest.fn(), verify: jest.fn() } as unknown as jest.Mocked<TotpService>;
  const jwt = { sign: jest.fn(), verify: jest.fn() } as unknown as jest.Mocked<JwtService>;
  const config = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>;

  const useCase = new VerifyPlatformAdminTotpUseCase(admins, hasher, totp, jwt, config);

  const pendingPayload: PlatformPendingTwoFactorJwtPayload = { sub: 'admin-1', scope: 'platform-2fa-pending' };
  const admin = new PlatformAdmin('admin-1', 'a@a.com', 'hash', 'Admin', 'active', 'SECRET123', true, [
    'hash-of-r1',
    'hash-of-r2',
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string) =>
      key === 'PLATFORM_JWT_SECRET' ? 'secret' : key === 'PLATFORM_JWT_EXPIRES_IN' ? '1h' : undefined,
    );
    (jwt.verify as jest.Mock).mockReturnValue(pendingPayload);
    admins.findById.mockResolvedValue(admin);
    jwt.sign.mockReturnValue('real.access.token');
    totp.verify.mockReturnValue(false);
    hasher.compare.mockResolvedValue(false);
  });

  it('rechaza si el token pendiente venció o es inválido', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt expired');
    });
    await expect(useCase.execute({ pendingToken: 'x', code: '123456' })).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza si el token pendiente tiene otro scope', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ sub: 'admin-1', scope: 'platform' });
    await expect(useCase.execute({ pendingToken: 'x', code: '123456' })).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza si el código TOTP y ningún código de recuperación coinciden', async () => {
    await expect(useCase.execute({ pendingToken: 'x', code: '000000' })).rejects.toThrow(UnauthorizedException);
  });

  it('acepta un código TOTP válido y devuelve el access token real', async () => {
    totp.verify.mockReturnValue(true);

    const result = await useCase.execute({ pendingToken: 'x', code: '654321' });

    expect(result.accessToken).toBe('real.access.token');
    expect(admins.save).not.toHaveBeenCalled(); // TOTP válido no consume nada
  });

  it('acepta un código de recuperación válido, lo consume, y devuelve el access token real', async () => {
    hasher.compare.mockImplementation(async (plain, hash) => hash === 'hash-of-r1');

    const result = await useCase.execute({ pendingToken: 'x', code: 'r1' });

    expect(result.accessToken).toBe('real.access.token');
    expect(admins.save).toHaveBeenCalledTimes(1);
    expect(admin.getRecoveryCodeHashes()).toEqual(['hash-of-r2']);
  });
});
