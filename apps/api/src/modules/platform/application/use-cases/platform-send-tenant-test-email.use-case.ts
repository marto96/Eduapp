import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmEmailTemplateRepository } from '../../../email/infrastructure/repositories/typeorm-email-template.repository';
import { EmailTemplateService } from '../../../email/application/services/email-template.service';
import { EmailPort } from '../../../email/application/ports/email.port';
import { SendTestEmailUseCase } from '../../../email/application/use-cases/send-test-email.use-case';
import { EmailTemplateType } from '../../../email/domain/entities/email-template.entity';

/**
 * `EmailPort` no depende del schema de ningún tenant (es un cliente HTTP
 * stateless hacia Resend), así que se inyecta normal por DI — solo el
 * repositorio de plantillas se arma a mano contra la conexión ad-hoc del
 * tenant elegido, igual que el resto de los casos de uso `Platform*`.
 */
@Injectable()
export class PlatformSendTenantTestEmailUseCase {
  constructor(
    @Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort,
    @Inject(EmailPort) private readonly emailPort: EmailPort,
  ) {}

  async execute(tenantId: string, type: EmailTemplateType, to: string): Promise<void> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    await withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const templates = new TypeOrmEmailTemplateRepository(dataSource);
      const templateService = new EmailTemplateService(templates);
      await new SendTestEmailUseCase(templateService, this.emailPort).execute(type, to);
    });
  }
}
