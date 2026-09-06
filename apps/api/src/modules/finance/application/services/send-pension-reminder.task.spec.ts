import { SendPensionReminderTask } from './send-pension-reminder.task';
import { TenantRepositoryPort } from '../../../platform/application/ports/tenant.repository.port';
import { TenantConnectionProvider } from '../../../../core/database/tenant-connection.provider';
import { EmailPort } from '../../../email/application/ports/email.port';
import { Tenant } from '../../../platform/domain/entities/tenant.entity';

describe('SendPensionReminderTask', () => {
  const tenants = { findAll: jest.fn() } as unknown as jest.Mocked<TenantRepositoryPort>;
  const connections = { getConnectionForSchema: jest.fn() } as unknown as jest.Mocked<TenantConnectionProvider>;
  const emailPort = { send: jest.fn() } as unknown as jest.Mocked<EmailPort>;

  const task = new SendPensionReminderTask(tenants, connections, emailPort);

  const activeTenant = new Tenant('tenant-1', 'Colegio Demo', 'demo', null, 'tenant_colegio_demo', 'active', [], null, null);
  const suspendedTenant = new Tenant('tenant-2', 'Colegio Suspendido', 'susp', null, 'tenant_susp', 'suspended', [], null, null);

  beforeEach(() => jest.clearAllMocks());

  it('salta los tenants suspendidos sin abrir conexión', async () => {
    tenants.findAll.mockResolvedValue([suspendedTenant]);

    await task.run();

    expect(connections.getConnectionForSchema).not.toHaveBeenCalled();
  });

  it('procesa cada tenant activo por separado, sin que uno rompa a los demás', async () => {
    tenants.findAll.mockResolvedValue([activeTenant]);
    connections.getConnectionForSchema.mockRejectedValue(new Error('conexión caída'));

    await expect(task.run()).resolves.toBeUndefined();
  });
});
