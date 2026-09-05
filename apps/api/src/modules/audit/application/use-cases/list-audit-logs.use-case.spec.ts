import { ListAuditLogsUseCase } from './list-audit-logs.use-case';
import { AuditLogRepositoryPort } from '../ports/audit-log.repository.port';
import { AuditLog } from '../../domain/entities/audit-log.entity';

describe('ListAuditLogsUseCase', () => {
  const auditLogs: jest.Mocked<AuditLogRepositoryPort> = {
    record: jest.fn(),
    findAll: jest.fn(),
  };

  const useCase = new ListAuditLogsUseCase(auditLogs);

  const entry = new AuditLog(
    'log-1',
    'user-1',
    'admin@test.com',
    ['admin_institucion'],
    'DELETE',
    '/academic/sections/sec-1',
    'sec-1',
    204,
    true,
    'write',
    '127.0.0.1',
    new Date('2026-09-05T10:00:00Z'),
  );

  beforeEach(() => jest.clearAllMocks());

  it('normaliza page/pageSize inválidos a los defaults seguros', async () => {
    auditLogs.findAll.mockResolvedValue({ items: [entry], total: 1 });

    const result = await useCase.execute({ page: -5, pageSize: 999 });

    expect(auditLogs.findAll).toHaveBeenCalledWith(
      { search: undefined, kind: undefined, from: undefined, to: undefined },
      { page: 1, pageSize: 25 },
    );
    expect(result).toEqual({ items: [entry], total: 1, page: 1, pageSize: 25 });
  });

  it('recorta el término de búsqueda antes de pasarlo al filtro', async () => {
    auditLogs.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, pageSize: 25, search: '  admin  ' });

    expect(auditLogs.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'admin' }),
      { page: 1, pageSize: 25 },
    );
  });
});
