import { NotFoundException } from '@nestjs/common';
import { PlatformCreateTenantUserUseCase } from './platform-create-tenant-user.use-case';
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

describe('PlatformCreateTenantUserUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(),
    findBySubdomain: jest.fn(),
    findByCustomDomain: jest.fn(),
    findAll: jest.fn(),
    existsBySubdomain: jest.fn(),
    save: jest.fn(),
  };
  const useCase = new PlatformCreateTenantUserUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const platformAdmin: PlatformJwtPayload = { sub: 'admin-1', email: 'super@eduapp.test', scope: 'platform' };
  const input = { email: 'nuevo@santateresa.test', password: 'Demo12345!', firstName: 'Ana', lastName: 'Admin', roles: ['admin_institucion' as const] };

  const fakeUserRepo = { findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), findById: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmUserRepository as jest.Mock).mockImplementation(() => fakeUserRepo);
    fakeUserRepo.findByEmail.mockResolvedValue(null);
    fakeUserRepo.findByDocumentNumber.mockResolvedValue(null);
    fakeUserRepo.save.mockResolvedValue(undefined);
  });

  it('rechaza si el tenant no existe, sin intentar abrir ninguna conexión', async () => {
    tenants.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant-x', input, platformAdmin)).rejects.toThrow(NotFoundException);
    expect(withTenantSchemaConnection).not.toHaveBeenCalled();
  });

  it('crea el usuario contra el schema del tenant elegido y audita la acción', async () => {
    const result = await useCase.execute('tenant-1', input, platformAdmin);

    expect(withTenantSchemaConnection).toHaveBeenCalledWith('tenant_santateresa', expect.any(Function));
    expect(result).toBeInstanceOf(User);
    expect(result.email).toBe(input.email);
    expect(fakeUserRepo.save).toHaveBeenCalledTimes(1);
    expect(recordPlatformAudit).toHaveBeenCalledWith(
      fakeDataSource,
      'create',
      'User',
      result.id,
      platformAdmin,
    );
  });
});
