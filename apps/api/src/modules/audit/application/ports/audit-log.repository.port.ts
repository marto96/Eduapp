import { AuditLog, AuditLogKind } from '../../domain/entities/audit-log.entity';
import { PaginationParams } from '../../../../core/http/pagination.dto';

export interface RecordAuditLogEntry {
  actorId: string | null;
  actorEmail: string | null;
  actorRoles: string[] | null;
  method: string;
  route: string;
  resourceId: string | null;
  statusCode: number | null;
  success: boolean;
  kind: AuditLogKind;
  ipAddress: string | null;
}

export interface AuditLogFilter {
  /** Coincidencia parcial, sin distinguir mayúsculas, contra `actorEmail` o `route`. */
  search?: string;
  kind?: AuditLogKind;
  from?: string;
  to?: string;
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  total: number;
}

export abstract class AuditLogRepositoryPort {
  abstract record(entry: RecordAuditLogEntry): Promise<void>;
  abstract findAll(filter: AuditLogFilter, pagination: PaginationParams): Promise<PaginatedAuditLogs>;
}
