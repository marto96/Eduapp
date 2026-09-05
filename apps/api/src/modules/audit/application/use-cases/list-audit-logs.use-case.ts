import { Inject, Injectable } from '@nestjs/common';
import { AuditLogRepositoryPort } from '../ports/audit-log.repository.port';
import { AuditLog, AuditLogKind } from '../../domain/entities/audit-log.entity';
import { PaginatedResult } from '../../../../core/http/pagination.dto';
import { normalizePagination } from '../../../../core/http/pagination';

export interface ListAuditLogsQuery {
  search?: string;
  kind?: AuditLogKind;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ListAuditLogsUseCase {
  constructor(@Inject(AuditLogRepositoryPort) private readonly auditLogs: AuditLogRepositoryPort) {}

  async execute(query: ListAuditLogsQuery): Promise<PaginatedResult<AuditLog>> {
    const { page, pageSize } = normalizePagination(query.page, query.pageSize);
    const { items, total } = await this.auditLogs.findAll(
      {
        search: query.search?.trim() || undefined,
        kind: query.kind,
        from: query.from,
        to: query.to,
      },
      { page, pageSize },
    );
    return { items, total, page, pageSize };
  }
}
