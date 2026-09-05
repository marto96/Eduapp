import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  AuditLogFilter,
  AuditLogRepositoryPort,
  PaginatedAuditLogs,
  RecordAuditLogEntry,
} from '../../application/ports/audit-log.repository.port';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import { AuditLogOrmEntity } from '../entities/audit-log.orm-entity';
import { PaginationParams } from '../../../../core/http/pagination.dto';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmAuditLogRepository extends AuditLogRepositoryPort {
  private readonly repo: Repository<AuditLogOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AuditLogOrmEntity);
  }

  async record(entry: RecordAuditLogEntry): Promise<void> {
    await this.repo.save({ id: randomUUID(), ...entry });
  }

  async findAll(filter: AuditLogFilter, pagination: PaginationParams): Promise<PaginatedAuditLogs> {
    const query = this.repo.createQueryBuilder('log').orderBy('log.created_at', 'DESC');

    if (filter.search) {
      query.andWhere('(log.actor_email ILIKE :term OR log.route ILIKE :term)', {
        term: `%${filter.search}%`,
      });
    }
    if (filter.kind) {
      query.andWhere('log.kind = :kind', { kind: filter.kind });
    }
    if (filter.from) {
      query.andWhere('log.created_at >= :from', { from: filter.from });
    }
    if (filter.to) {
      query.andWhere('log.created_at <= :to', { to: filter.to });
    }

    const [rows, total] = await query
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .getManyAndCount();

    return { items: rows.map((row) => this.toDomain(row)), total };
  }

  private toDomain(row: AuditLogOrmEntity): AuditLog {
    return new AuditLog(
      row.id,
      row.actorId,
      row.actorEmail,
      row.actorRoles,
      row.method,
      row.route,
      row.resourceId,
      row.statusCode,
      row.success,
      row.kind,
      row.ipAddress,
      row.createdAt,
    );
  }
}
