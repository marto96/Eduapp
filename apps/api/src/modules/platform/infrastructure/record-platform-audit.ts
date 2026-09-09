import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmAuditLogRepository } from '../../audit/infrastructure/repositories/typeorm-audit-log.repository';
import { PlatformJwtPayload } from '../../../core/auth/platform-jwt-payload.interface';

const logger = new Logger('PlatformAudit');

/**
 * Best-effort: se llama DESPUÉS de que la acción principal ya se guardó
 * con éxito. Si el insert de auditoría falla, se loguea y se sigue — no
 * tiene sentido revertir una escritura que ya está confirmada por un
 * problema al registrar quién la hizo (mismo criterio que ya usa el
 * sistema, ej. `notify-new-grade.service.ts`).
 */
export async function recordPlatformAudit(
  dataSource: DataSource,
  action: string,
  subject: string,
  resourceId: string | null,
  platformAdmin: PlatformJwtPayload,
): Promise<void> {
  try {
    const auditLogs = new TypeOrmAuditLogRepository(dataSource);
    await auditLogs.record({
      actorId: `platform-admin:${platformAdmin.sub}`,
      actorEmail: platformAdmin.email,
      actorRoles: ['platform_admin'],
      method: action,
      route: `platform/tenants/:tenantId/users (${subject})`,
      resourceId,
      statusCode: 200,
      success: true,
      kind: 'write',
      ipAddress: null,
    });
  } catch (err) {
    logger.warn(`No se pudo registrar la auditoría de una acción de plataforma: ${(err as Error).message}`);
  }
}
