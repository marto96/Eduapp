import { NotFoundException } from '@nestjs/common';
import { PlatformListTenantUsersUseCase } from './platform-list-tenant-users.use-case';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';

jest.mock('../../infrastructure/tenant-schema-connection');
jest.mock('../../infrastructure/record-platform-audit');
jest.mock('../../../identity/infrastructure/repositories/typeorm-user.repository');

describe('PlatformListTenantUsersUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(),
    findBySubdomain: jest.fn(),
    findByCustomDomain: jest.fn(),
    findAll: jest.fn(),
    existsBySubdomain: jest.fn(),
    save: jest.fn(),
  };
  const useCase = new PlatformListTenantUsersUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const fakeUser = new User('user-1', 'a@a.com', 'hash', 'Ana', 'Admin', ['admin_institucion'], 'active', 0, null, null, null, null, null);
  const fakeUserRepo = { findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), findById: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmUserRepository as jest.Mock).mockImplementation(() => fakeUserRepo);
    fakeUserRepo.findAll.mockResolvedValue({ items: [fakeUser], total: 1 });
  });

  it('rechaza si el tenant no existe', async () => {
    tenants.findById.mockResolvedValue(null);
    await expect(useCase.execute('tenant-x')).rejects.toThrow(NotFoundException);
  });

  it('lista los usuarios del schema del tenant elegido sin auditar (es una lectura)', async () => {
    const result = await useCase.execute('tenant-1');

    expect(withTenantSchemaConnection).toHaveBeenCalledWith('tenant_santateresa', expect.any(Function));
    expect(result).toEqual([fakeUser]);
    expect(recordPlatformAudit).not.toHaveBeenCalled();
  });

  it('pagina cuando se pasan page/pageSize', async () => {
    const result = await useCase.execute('tenant-1', undefined, 1, 25);

    expect(fakeUserRepo.findAll).toHaveBeenCalledWith(undefined, { page: 1, pageSize: 25 });
    expect(result).toEqual({ items: [fakeUser], total: 1, page: 1, pageSize: 25 });
  });
});
