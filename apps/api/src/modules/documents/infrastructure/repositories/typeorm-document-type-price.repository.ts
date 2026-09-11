import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DocumentTypePriceRepositoryPort } from '../../application/ports/document-type-price.repository.port';
import { DocumentTypePrice } from '../../domain/entities/document-type-price.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';
import { DocumentTypePriceOrmEntity } from '../entities/document-type-price.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmDocumentTypePriceRepository extends DocumentTypePriceRepositoryPort {
  private readonly repo: Repository<DocumentTypePriceOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(DocumentTypePriceOrmEntity);
  }

  async findAll(): Promise<DocumentTypePrice[]> {
    const rows = await this.repo.find();
    return rows.map((row) => new DocumentTypePrice(row.type, row.amount));
  }

  async findByType(type: DocumentType): Promise<DocumentTypePrice | null> {
    const row = await this.repo.findOne({ where: { type } });
    return row ? new DocumentTypePrice(row.type, row.amount) : null;
  }

  async save(price: DocumentTypePrice): Promise<void> {
    await this.repo.save({ type: price.type, amount: price.amount });
  }
}
