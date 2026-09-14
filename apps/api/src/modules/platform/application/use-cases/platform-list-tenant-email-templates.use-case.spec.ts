import { NotFoundException } from '@nestjs/common';
import { PlatformListTenantEmailTemplatesUseCase } from './platform-list-tenant-email-templates.use-case';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmEmailTemplateRepository } from '../../../email/infrastructure/repositories/typeorm-email-template.repository';
import { EmailTemplate } from '../../../email/domain/entities/email-template.entity';

jest.mock('../../infrastructure/tenant-schema-connection');
jest.mock('../../../email/infrastructure/repositories/typeorm-email-template.repository');

describe('PlatformListTenantEmailTemplatesUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };
  const useCase = new PlatformListTenantEmailTemplatesUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const fakeTemplate = new EmailTemplate('t-1', 'pago_aprobado', 'Asunto', '<p>Cuerpo</p>', new Date().toISOString());
  const fakeTemplatesRepo = { findByType: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmEmailTemplateRepository as jest.Mock).mockImplementation(() => fakeTemplatesRepo);
    fakeTemplatesRepo.findAll.mockResolvedValue([fakeTemplate]);
  });

  it('rechaza si el tenant no existe, sin intentar abrir ninguna conexión', async () => {
    tenants.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant-x')).rejects.toThrow(NotFoundException);
    expect(withTenantSchemaConnection).not.toHaveBeenCalled();
  });

  it('delega en ListEmailTemplatesUseCase contra el schema del tenant elegido', async () => {
    const result = await useCase.execute('tenant-1');

    expect(withTenantSchemaConnection).toHaveBeenCalledWith('tenant_santateresa', expect.any(Function));
    expect(fakeTemplatesRepo.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(6);
    expect(result).toContainEqual(
      expect.objectContaining({ type: 'pago_aprobado', subject: 'Asunto', body: '<p>Cuerpo</p>', isCustom: true }),
    );
  });
});
