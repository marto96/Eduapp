import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmAuditLogRepository } from '../../../audit/infrastructure/repositories/typeorm-audit-log.repository';
import {
  ListAuditLogsUseCase,
  ListAuditLogsQuery,
} from '../../../audit/application/use-cases/list-audit-logs.use-case';
import { AuditLog } from '../../../audit/domain/entities/audit-log.entity';
import { PaginatedResult } from '../../../../core/http/pagination.dto';

@Injectable()
export class PlatformListTenantAuditLogsUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(tenantId: string, query: ListAuditLogsQuery): Promise<PaginatedResult<AuditLog>> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const auditLogs = new TypeOrmAuditLogRepository(dataSource);
      return new ListAuditLogsUseCase(auditLogs).execute(query);
    });
  }
}
