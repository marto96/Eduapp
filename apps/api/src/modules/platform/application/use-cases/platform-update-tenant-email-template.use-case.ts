import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmEmailTemplateRepository } from '../../../email/infrastructure/repositories/typeorm-email-template.repository';
import {
  UpdateEmailTemplateUseCase,
  UpdateEmailTemplateInput,
} from '../../../email/application/use-cases/update-email-template.use-case';
import { EmailTemplateType } from '../../../email/domain/entities/email-template.entity';

@Injectable()
export class PlatformUpdateTenantEmailTemplateUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(tenantId: string, type: EmailTemplateType, input: UpdateEmailTemplateInput): Promise<void> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    await withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const templates = new TypeOrmEmailTemplateRepository(dataSource);
      await new UpdateEmailTemplateUseCase(templates).execute(type, input);
    });
  }
}
