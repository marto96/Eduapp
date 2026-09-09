import { DataSource } from 'typeorm';
import { recordPlatformAudit } from './record-platform-audit';
import { TypeOrmAuditLogRepository } from '../../audit/infrastructure/repositories/typeorm-audit-log.repository';
import { PlatformJwtPayload } from '../../../core/auth/platform-jwt-payload.interface';

jest.mock('../../audit/infrastructure/repositories/typeorm-audit-log.repository');

describe('recordPlatformAudit', () => {
  const platformAdmin: PlatformJwtPayload = { sub: 'admin-1', email: 'super@eduapp.test', scope: 'platform' };
  const fakeDataSource = {} as DataSource;

  beforeEach(() => jest.clearAllMocks());

  it('registra el audit log con el actor prefijado como platform-admin', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    (TypeOrmAuditLogRepository as jest.Mock).mockImplementation(() => ({ record }));

    await recordPlatformAudit(fakeDataSource, 'create', 'User', 'user-1', platformAdmin);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'platform-admin:admin-1',
        actorEmail: 'super@eduapp.test',
        resourceId: 'user-1',
        success: true,
        kind: 'write',
      }),
    );
  });

  it('no interrumpe si falla el registro de auditoría (best-effort)', async () => {
    const record = jest.fn().mockRejectedValue(new Error('db down'));
    (TypeOrmAuditLogRepository as jest.Mock).mockImplementation(() => ({ record }));

    await expect(
      recordPlatformAudit(fakeDataSource, 'create', 'User', 'user-1', platformAdmin),
    ).resolves.toBeUndefined();
  });
});
