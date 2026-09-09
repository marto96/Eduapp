import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { PlatformImpersonateTenantUserUseCase } from './platform-impersonate-tenant-user.use-case';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';

jest.mock('../../infrastructure/tenant-schema-connection');
jest.mock('../../infrastructure/record-platform-audit');
jest.mock('../../../identity/infrastructure/repositories/typeorm-user.repository');

describe('PlatformImpersonateTenantUserUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };

  const configValues: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access-secret',
    IMPERSONATION_SESSION_EXPIRES_IN: '45m',
    TENANT_BASE_DOMAIN: 'localhost:3000',
  };
  const jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as jest.Mocked<JwtService>;
  const config = { get: jest.fn((key: string) => configValues[key]) } as unknown as jest.Mocked<ConfigService>;
  const redis = { set: jest.fn().mockResolvedValue('OK') };

  const useCase = new PlatformImpersonateTenantUserUseCase(tenants, jwt, config, redis as unknown as Redis);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const platformAdmin: PlatformJwtPayload = { sub: 'admin-1', email: 'super@eduapp.test', scope: 'platform' };
  const activeUser = new User(
    'user-1', 'a@santateresa.test', 'hash', 'Ana', 'Admin', ['docente'], 'active',
    0, null, null, null, null, null,
  );
  const suspendedUser = new User(
    'user-2', 'b@santateresa.test', 'hash', 'Bruno', 'Docente', ['docente'], 'suspended',
    0, null, null, null, null, null,
  );

  const fakeUserRepo = { findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), findById: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmUserRepository as jest.Mock).mockImplementation(() => fakeUserRepo);
    fakeUserRepo.findById.mockResolvedValue(activeUser);
    (jwt.sign as jest.Mock).mockReturnValue('signed.jwt.token');
    redis.set.mockResolvedValue('OK');
  });

  it('rechaza si el tenant no existe, sin intentar abrir ninguna conexión', async () => {
    tenants.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant-x', 'user-1', platformAdmin)).rejects.toThrow(NotFoundException);
    expect(withTenantSchemaConnection).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario no existe', async () => {
    fakeUserRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant-1', 'user-x', platformAdmin)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el usuario no está activo, sin firmar ningún token', async () => {
    fakeUserRepo.findById.mockResolvedValue(suspendedUser);

    await expect(useCase.execute('tenant-1', 'user-2', platformAdmin)).rejects.toThrow(BadRequestException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('firma un access token con impersonatedBy y sin refresh token, lo guarda en Redis con TTL de 30s, y devuelve la handoffUrl con el código', async () => {
    const result = await useCase.execute('tenant-1', 'user-1', platformAdmin);

    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 'user-1', email: 'a@santateresa.test', roles: ['docente'], tenantId: 'tenant-1', impersonatedBy: 'admin-1' },
      { secret: 'access-secret', expiresIn: '45m' },
    );
    expect(redis.set).toHaveBeenCalledWith(expect.any(String), 'signed.jwt.token', 'EX', 30);

    const [redisKey] = redis.set.mock.calls[0];
    expect(redisKey).toMatch(/^impersonation:handoff:/);
    const code = redisKey.replace('impersonation:handoff:', '');
    expect(result.handoffUrl).toBe(`http://santateresa.localhost:3000/impersonate/consume?code=${code}`);
  });

  it('usa el dominio propio del tenant (https) si tiene uno configurado, en vez de subdominio.dominio_base', async () => {
    const tenantWithCustomDomain = new Tenant(
      'tenant-1', 'Santa Teresa', 'santateresa', 'santateresa.edu.co', 'tenant_santateresa', 'active', [],
    );
    tenants.findById.mockResolvedValue(tenantWithCustomDomain);

    const result = await useCase.execute('tenant-1', 'user-1', platformAdmin);

    const [redisKey] = redis.set.mock.calls[0];
    const code = redisKey.replace('impersonation:handoff:', '');
    expect(result.handoffUrl).toBe(`https://santateresa.edu.co/impersonate/consume?code=${code}`);
  });

  it('audita el inicio de la impersonación', async () => {
    await useCase.execute('tenant-1', 'user-1', platformAdmin);

    expect(recordPlatformAudit).toHaveBeenCalledWith(fakeDataSource, 'impersonate', 'User', 'user-1', platformAdmin);
  });
});
