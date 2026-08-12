import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  IssuedDocumentFilter,
  IssuedDocumentRepositoryPort,
} from '../../application/ports/issued-document.repository.port';
import { IssuedDocument } from '../../domain/entities/issued-document.entity';
import { IssuedDocumentOrmEntity } from '../entities/issued-document.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmIssuedDocumentRepository extends IssuedDocumentRepositoryPort {
  private readonly repo: Repository<IssuedDocumentOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(IssuedDocumentOrmEntity);
  }

  async findAll(filter?: IssuedDocumentFilter): Promise<IssuedDocument[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.enrollmentId && { enrollmentId: filter.enrollmentId }),
        ...(filter?.type && { type: filter.type }),
      },
      order: { issuedAt: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<IssuedDocument | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(document: IssuedDocument): Promise<void> {
    await this.repo.save({
      id: document.id,
      enrollmentId: document.enrollmentId,
      type: document.type,
      description: document.description,
      issuedAt: document.issuedAt,
      issuedBy: document.issuedBy,
      voidedAt: document.voidedAt ? new Date(document.voidedAt) : null,
      pdfGeneratedAt: document.pdfGeneratedAt ? new Date(document.pdfGeneratedAt) : null,
    });
  }

  private toDomain(row: IssuedDocumentOrmEntity): IssuedDocument {
    return new IssuedDocument(
      row.id,
      row.enrollmentId,
      row.type,
      row.description,
      row.issuedAt,
      row.issuedBy,
      row.voidedAt ? row.voidedAt.toISOString() : null,
      row.pdfGeneratedAt ? row.pdfGeneratedAt.toISOString() : null,
    );
  }
}
