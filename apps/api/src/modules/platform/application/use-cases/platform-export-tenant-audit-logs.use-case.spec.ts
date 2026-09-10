import { NotFoundException } from '@nestjs/common';
import { PlatformExportTenantAuditLogsUseCase } from './platform-export-tenant-audit-logs.use-case';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { AuditLog } from '../../../audit/domain/entities/audit-log.entity';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmAuditLogRepository } from '../../../audit/infrastructure/repositories/typeorm-audit-log.repository';

jest.mock('../../infrastructure/tenant-schema-connection');
jest.mock('../../../audit/infrastructure/repositories/typeorm-audit-log.repository');

describe('PlatformExportTenantAuditLogsUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };
  const useCase = new PlatformExportTenantAuditLogsUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const fakeLog = new AuditLog(
    'log-1', 'user-1', 'admin@santateresa.test', ['admin_institucion'],
    'PATCH', '/users/user-2', 'user-2', 200, true, 'write', '127.0.0.1',
    new Date('2026-09-10T10:00:00.000Z'), 'admin-9',
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

  it('pide hasta 10.000 filas de una sola vez, sin pasar por la paginación de pantalla', async () => {
    await useCase.execute('tenant-1', { search: 'admin' });

    expect(fakeAuditLogRepo.findAll).toHaveBeenCalledWith({ search: 'admin' }, { page: 1, pageSize: 10_000 });
  });

  it('arma el CSV con encabezado y una fila por log, sin registrar ninguna auditoría', async () => {
    const csv = await useCase.execute('tenant-1', {});

    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'fecha,actor_email,actor_roles,metodo,ruta,recurso_id,codigo_estado,exito,tipo,ip,via_impersonacion',
    );
    expect(lines[1]).toBe(
      '2026-09-10T10:00:00.000Z,admin@santateresa.test,admin_institucion,PATCH,/users/user-2,user-2,200,si,write,127.0.0.1,admin-9',
    );
    expect(fakeAuditLogRepo.record).not.toHaveBeenCalled();
  });
});
