import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmEmailTemplateRepository } from '../../../email/infrastructure/repositories/typeorm-email-template.repository';
import {
  ListEmailTemplatesUseCase,
  EmailTemplateSummary,
} from '../../../email/application/use-cases/list-email-templates.use-case';

@Injectable()
export class PlatformListTenantEmailTemplatesUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(tenantId: string): Promise<EmailTemplateSummary[]> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const templates = new TypeOrmEmailTemplateRepository(dataSource);
      return new ListEmailTemplatesUseCase(templates).execute();
    });
  }
}
