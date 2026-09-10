import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmAuditLogRepository } from '../../../audit/infrastructure/repositories/typeorm-audit-log.repository';
import { AuditLog } from '../../../audit/domain/entities/audit-log.entity';
import { AuditLogFilter } from '../../../audit/application/ports/audit-log.repository.port';

/**
 * Tope de seguridad para exportar — no hay streaming ni paginación en la
 * exportación misma. Si un tenant supera esto de forma rutinaria, se
 * revisita (ver spec, sección "No-objetivos").
 */
const EXPORT_MAX_ROWS = 10_000;

@Injectable()
export class PlatformExportTenantAuditLogsUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(tenantId: string, filter: AuditLogFilter): Promise<string> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const auditLogs = new TypeOrmAuditLogRepository(dataSource);
      const { items } = await auditLogs.findAll(filter, { page: 1, pageSize: EXPORT_MAX_ROWS });
      return toCsv(items);
    });
  }
}

function toCsv(logs: AuditLog[]): string {
  const header = 'fecha,actor_email,actor_roles,metodo,ruta,recurso_id,codigo_estado,exito,tipo,ip,via_impersonacion';
  const rows = logs.map((log) =>
    [
      log.createdAt.toISOString(),
      log.actorEmail ?? '',
      (log.actorRoles ?? []).join('|'),
      log.method,
      log.route,
      log.resourceId ?? '',
      log.statusCode ?? '',
      log.success ? 'si' : 'no',
      log.kind,
      log.ipAddress ?? '',
      log.impersonatedBy ?? '',
    ]
      .map(escapeCsvField)
      .join(','),
  );
  return [header, ...rows].join('\n');
}

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
