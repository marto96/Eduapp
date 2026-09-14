import { NotFoundException } from '@nestjs/common';
import { PlatformSendTenantTestEmailUseCase } from './platform-send-tenant-test-email.use-case';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { EmailPort } from '../../../email/application/ports/email.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmEmailTemplateRepository } from '../../../email/infrastructure/repositories/typeorm-email-template.repository';

jest.mock('../../infrastructure/tenant-schema-connection');
jest.mock('../../../email/infrastructure/repositories/typeorm-email-template.repository');

describe('PlatformSendTenantTestEmailUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };
  const emailPort: jest.Mocked<EmailPort> = { send: jest.fn() };
  const useCase = new PlatformSendTenantTestEmailUseCase(tenants, emailPort);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const fakeTemplatesRepo = { findByType: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmEmailTemplateRepository as jest.Mock).mockImplementation(() => fakeTemplatesRepo);
    fakeTemplatesRepo.findByType.mockResolvedValue(null);
  });

  it('rechaza si el tenant no existe, sin intentar abrir ninguna conexión', async () => {
    tenants.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant-x', 'pago_aprobado', 'test@eduapp.co')).rejects.toThrow(
      NotFoundException,
    );
    expect(withTenantSchemaConnection).not.toHaveBeenCalled();
    expect(emailPort.send).not.toHaveBeenCalled();
  });

  it('manda el email de prueba renderizado contra el schema del tenant elegido', async () => {
    await useCase.execute('tenant-1', 'pago_aprobado', 'test@eduapp.co');

    expect(withTenantSchemaConnection).toHaveBeenCalledWith('tenant_santateresa', expect.any(Function));
    expect(emailPort.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@eduapp.co' }),
    );
  });

  it('propaga el error si el envío falla (a diferencia del envío best-effort normal)', async () => {
    emailPort.send.mockRejectedValue(new Error('API key inválida'));

    await expect(useCase.execute('tenant-1', 'pago_aprobado', 'test@eduapp.co')).rejects.toThrow(
      'API key inválida',
    );
  });
});
