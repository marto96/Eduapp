import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticatePlatformAdminUseCase } from './authenticate-platform-admin.use-case';
import { PlatformAdminRepositoryPort } from '../ports/platform-admin.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';
import { PlatformAdmin } from '../../domain/entities/platform-admin.entity';

describe('AuthenticatePlatformAdminUseCase', () => {
  const admins: jest.Mocked<PlatformAdminRepositoryPort> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const hasher: jest.Mocked<PasswordHasherPort> = { hash: jest.fn(), compare: jest.fn() };
  const jwt = { sign: jest.fn() } as unknown as jest.Mocked<JwtService>;
  const config = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>;

  const useCase = new AuthenticatePlatformAdminUseCase(admins, hasher, jwt, config);

  const input = { email: 'admin@eduapp.test', password: 'Super12345!' };

  beforeEach(() => {
    jest.clearAllMocks();
    hasher.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('signed.jwt.token');
    config.get.mockImplementation((key: string) =>
      key === 'PLATFORM_JWT_SECRET' ? 'secret' : key === 'PLATFORM_JWT_EXPIRES_IN' ? '1h' : undefined,
    );
  });

  it('rechaza credenciales inválidas', async () => {
    admins.findByEmail.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza si la contraseña no coincide', async () => {
    admins.findByEmail.mockResolvedValue(new PlatformAdmin('admin-1', input.email, 'hash', 'Admin', 'active'));
    hasher.compare.mockResolvedValue(false);
    await expect(useCase.execute(input)).rejects.toThrow(UnauthorizedException);
  });

  it('sin 2FA habilitado, devuelve el access token directo (comportamiento sin cambios)', async () => {
    admins.findByEmail.mockResolvedValue(new PlatformAdmin('admin-1', input.email, 'hash', 'Admin', 'active'));

    const result = await useCase.execute(input);

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.pendingTwoFactorToken).toBeUndefined();
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 'admin-1', email: input.email, scope: 'platform' },
      { secret: 'secret', expiresIn: '1h' },
    );
  });

  it('con 2FA habilitado, devuelve un token pendiente en vez del access token', async () => {
    admins.findByEmail.mockResolvedValue(
      new PlatformAdmin('admin-1', input.email, 'hash', 'Admin', 'active', 'SECRET123', true, ['h1']),
    );

    const result = await useCase.execute(input);

    expect(result.accessToken).toBeUndefined();
    expect(result.pendingTwoFactorToken).toBe('signed.jwt.token');
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 'admin-1', scope: 'platform-2fa-pending' },
      { secret: 'secret', expiresIn: '5m' },
    );
  });
});
