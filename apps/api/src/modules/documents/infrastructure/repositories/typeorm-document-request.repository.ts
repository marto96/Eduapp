import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  DocumentRequestFilter,
  DocumentRequestRepositoryPort,
} from '../../application/ports/document-request.repository.port';
import { DocumentRequest } from '../../domain/entities/document-request.entity';
import { DocumentRequestOrmEntity } from '../entities/document-request.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmDocumentRequestRepository extends DocumentRequestRepositoryPort {
  private readonly repo: Repository<DocumentRequestOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(DocumentRequestOrmEntity);
  }

  async findAll(filter?: DocumentRequestFilter): Promise<DocumentRequest[]> {
    const query = this.repo.createQueryBuilder('r').orderBy('r.requested_at', 'DESC');
    if (filter?.enrollmentIds) {
      query.andWhere('r.enrollment_id = ANY(:enrollmentIds)', { enrollmentIds: filter.enrollmentIds });
    }
    if (filter?.status) {
      query.andWhere('r.status = :status', { status: filter.status });
    }
    const rows = await query.getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<DocumentRequest | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByChargeId(chargeId: string): Promise<DocumentRequest | null> {
    const row = await this.repo.findOne({ where: { chargeId } });
    return row ? this.toDomain(row) : null;
  }

  async save(request: DocumentRequest): Promise<void> {
    await this.repo.save({
      id: request.id,
      enrollmentId: request.enrollmentId,
      type: request.type,
      deliveryMethod: request.deliveryMethod,
      note: request.note,
      requestedBy: request.requestedBy,
      requestedAt: new Date(request.requestedAt),
      status: request.status,
      chargeId: request.chargeId,
      issuedDocumentId: request.issuedDocumentId,
      resolvedBy: request.resolvedBy,
      resolvedAt: request.resolvedAt ? new Date(request.resolvedAt) : null,
      rejectionReason: request.rejectionReason,
    });
  }

  private toDomain(row: DocumentRequestOrmEntity): DocumentRequest {
    return new DocumentRequest(
      row.id,
      row.enrollmentId,
      row.type,
      row.deliveryMethod,
      row.note,
      row.requestedBy,
      row.requestedAt.toISOString(),
      row.status,
      row.chargeId,
      row.issuedDocumentId,
      row.resolvedBy,
      row.resolvedAt ? row.resolvedAt.toISOString() : null,
      row.rejectionReason,
    );
  }
}
