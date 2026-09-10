import { NotFoundException } from '@nestjs/common';
import { PlatformListTenantAuditLogsUseCase } from './platform-list-tenant-audit-logs.use-case';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { AuditLog } from '../../../audit/domain/entities/audit-log.entity';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmAuditLogRepository } from '../../../audit/infrastructure/repositories/typeorm-audit-log.repository';

jest.mock('../../infrastructure/tenant-schema-connection');
jest.mock('../../../audit/infrastructure/repositories/typeorm-audit-log.repository');

describe('PlatformListTenantAuditLogsUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };
  const useCase = new PlatformListTenantAuditLogsUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const fakeLog = new AuditLog(
    'log-1', 'user-1', 'admin@santateresa.test', ['admin_institucion'],
    'PATCH', '/users/user-2', 'user-2', 200, true, 'write', '127.0.0.1',
    new Date('2026-09-10T10:00:00Z'), null,
  );
  const fakeAuditLogRepo = { record: jest.fn(), findAll: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmAuditLogRepository as jest.Mock).mockImplementation(() => fakeAuditLogRepo);
    fakeAuditLogRepo.findAll.mockResolvedValue({ items: [fakeLog], total: 1 });
  });

  it('rechaza si el tenant no existe, sin intentar abrir ninguna conexión', async () => {
    tenants.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant-x', {})).rejects.toThrow(NotFoundException);
    expect(withTenantSchemaConnection).not.toHaveBeenCalled();
  });

  it('delega en ListAuditLogsUseCase contra el schema del tenant elegido', async () => {
    const result = await useCase.execute('tenant-1', { search: 'admin', page: 1, pageSize: 25 });

    expect(withTenantSchemaConnection).toHaveBeenCalledWith('tenant_santateresa', expect.any(Function));
    expect(fakeAuditLogRepo.findAll).toHaveBeenCalledWith(
      { search: 'admin', kind: undefined, from: undefined, to: undefined },
      { page: 1, pageSize: 25 },
    );
    expect(result).toEqual({ items: [fakeLog], total: 1, page: 1, pageSize: 25 });
  });
});
