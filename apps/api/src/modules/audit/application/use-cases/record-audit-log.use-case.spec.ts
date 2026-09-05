import { RecordAuditLogUseCase } from './record-audit-log.use-case';
import { AuditLogRepositoryPort } from '../ports/audit-log.repository.port';

describe('RecordAuditLogUseCase', () => {
  const auditLogs: jest.Mocked<AuditLogRepositoryPort> = {
    record: jest.fn(),
    findAll: jest.fn(),
  };

  const useCase = new RecordAuditLogUseCase(auditLogs);

  beforeEach(() => jest.clearAllMocks());

  it('delega en el repositorio con la misma entrada', async () => {
    const entry = {
      actorId: 'user-1',
      actorEmail: 'admin@test.com',
      actorRoles: ['admin_institucion'],
      method: 'DELETE',
      route: '/academic/sections/sec-1',
      resourceId: 'sec-1',
      statusCode: 204,
      success: true,
      kind: 'write' as const,
      ipAddress: '127.0.0.1',
    };

    await useCase.execute(entry);

    expect(auditLogs.record).toHaveBeenCalledWith(entry);
  });
});
