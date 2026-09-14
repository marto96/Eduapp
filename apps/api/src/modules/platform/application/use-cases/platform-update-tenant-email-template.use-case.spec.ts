import { NotFoundException } from '@nestjs/common';
import { PlatformUpdateTenantEmailTemplateUseCase } from './platform-update-tenant-email-template.use-case';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmEmailTemplateRepository } from '../../../email/infrastructure/repositories/typeorm-email-template.repository';

jest.mock('../../infrastructure/tenant-schema-connection');
jest.mock('../../../email/infrastructure/repositories/typeorm-email-template.repository');

describe('PlatformUpdateTenantEmailTemplateUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };
  const useCase = new PlatformUpdateTenantEmailTemplateUseCase(tenants);

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

    await expect(
      useCase.execute('tenant-x', 'pago_aprobado', { subject: 'Nuevo', body: '<p>Nuevo</p>' }),
    ).rejects.toThrow(NotFoundException);
    expect(withTenantSchemaConnection).not.toHaveBeenCalled();
  });

  it('guarda la plantilla contra el schema del tenant elegido', async () => {
    await useCase.execute('tenant-1', 'pago_aprobado', { subject: 'Nuevo', body: '<p>Nuevo</p>' });

    expect(withTenantSchemaConnection).toHaveBeenCalledWith('tenant_santateresa', expect.any(Function));
    expect(fakeTemplatesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pago_aprobado', subject: 'Nuevo', body: '<p>Nuevo</p>' }),
    );
  });

  it('sanitiza el body antes de guardar', async () => {
    await useCase.execute('tenant-1', 'pago_aprobado', {
      subject: 'Nuevo',
      body: '<p>Hola</p><script>alert(1)</script>',
    });

    expect(fakeTemplatesRepo.save).toHaveBeenCalledWith(expect.objectContaining({ body: '<p>Hola</p>' }));
  });
});
