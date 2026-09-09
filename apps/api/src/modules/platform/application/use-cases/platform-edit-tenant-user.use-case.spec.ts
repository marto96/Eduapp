import { NotFoundException } from '@nestjs/common';
import { PlatformEditTenantUserUseCase } from './platform-edit-tenant-user.use-case';
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

describe('PlatformEditTenantUserUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };
  const useCase = new PlatformEditTenantUserUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const platformAdmin: PlatformJwtPayload = { sub: 'admin-1', email: 'super@eduapp.test', scope: 'platform' };
  const existingUser = new User('user-1', 'old@santateresa.test', 'hash', 'Ana', 'Admin', ['admin_institucion'], 'active', 0, null, null, null, null, null);
  const input = { email: 'nuevo@santateresa.test', firstName: 'Ana', lastName: 'Admin', roles: ['admin_institucion' as const] };

  const fakeUserRepo = { findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), findById: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmUserRepository as jest.Mock).mockImplementation(() => fakeUserRepo);
    fakeUserRepo.findById.mockResolvedValue(existingUser);
    fakeUserRepo.findByEmail.mockResolvedValue(null);
    fakeUserRepo.save.mockResolvedValue(undefined);
  });

  it('rechaza si el tenant no existe', async () => {
    tenants.findById.mockResolvedValue(null);
    await expect(useCase.execute('tenant-x', 'user-1', input, platformAdmin)).rejects.toThrow(NotFoundException);
  });

  it('edita el usuario contra el schema del tenant elegido y audita la acción', async () => {
    const result = await useCase.execute('tenant-1', 'user-1', input, platformAdmin);

    expect(result.email).toBe(input.email);
    expect(recordPlatformAudit).toHaveBeenCalledWith(fakeDataSource, 'edit', 'User', 'user-1', platformAdmin);
  });
});
