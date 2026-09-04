import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  IssuedDocumentFilter,
  IssuedDocumentRepositoryPort,
  PaginatedIssuedDocuments,
} from '../../application/ports/issued-document.repository.port';
import { PaginationParams } from '../../../../core/http/pagination.dto';
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

  async findAll(
    filter: IssuedDocumentFilter | undefined,
    pagination?: PaginationParams,
  ): Promise<PaginatedIssuedDocuments> {
    const query = this.repo.createQueryBuilder('d').orderBy('d.issued_at', 'DESC');

    if (filter?.enrollmentId) {
      query.andWhere('d.enrollment_id = :enrollmentId', { enrollmentId: filter.enrollmentId });
    }
    if (filter?.enrollmentIds) {
      query.andWhere('d.enrollment_id = ANY(:enrollmentIds)', { enrollmentIds: filter.enrollmentIds });
    }
    if (filter?.type) {
      query.andWhere('d.type = :type', { type: filter.type });
    }
    if (filter?.search) {
      // El nombre del estudiante no vive en `documents` — hay que ir a
      // buscarlo vía enrollments -> users. Una subquery en el WHERE (en vez
      // de un JOIN) evita un bug de larga data de TypeORM (issues
      // #3356/#4270/#8213/#11742 en su repo): combinar `orderBy` + join +
      // `skip`/`take` revienta con "Cannot read properties of undefined
      // (reading 'databaseName')" — sin JOIN en la query principal, no hay
      // nada que combinar y el bug no se dispara.
      query.andWhere(
        `d.enrollment_id IN (
          SELECT e.id FROM enrollments e
          INNER JOIN users u ON u.id = e.student_id
          WHERE u.first_name ILIKE :term OR u.last_name ILIKE :term
        )`,
        { term: `%${filter.search}%` },
      );
    }

    if (!pagination) {
      const rows = await query.getMany();
      return { items: rows.map((row) => this.toDomain(row)), total: rows.length };
    }

    const [rows, total] = await query
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .getManyAndCount();

    return { items: rows.map((row) => this.toDomain(row)), total };
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
