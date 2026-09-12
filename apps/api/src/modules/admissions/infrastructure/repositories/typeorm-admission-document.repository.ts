import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AdmissionDocumentRepositoryPort } from '../../application/ports/admission-document.repository.port';
import { AdmissionDocument, AdmissionDocumentType } from '../../domain/entities/admission-document.entity';
import { AdmissionDocumentOrmEntity } from '../entities/admission-document.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmAdmissionDocumentRepository extends AdmissionDocumentRepositoryPort {
  private readonly repo: Repository<AdmissionDocumentOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AdmissionDocumentOrmEntity);
  }

  async findAllByApplication(admissionApplicationId: string): Promise<AdmissionDocument[]> {
    const rows = await this.repo.find({ where: { admissionApplicationId } });
    return rows.map((row) => this.toDomain(row));
  }

  async findByApplicationAndType(
    admissionApplicationId: string,
    type: AdmissionDocumentType,
  ): Promise<AdmissionDocument | null> {
    const row = await this.repo.findOne({ where: { admissionApplicationId, type } });
    return row ? this.toDomain(row) : null;
  }

  async save(document: AdmissionDocument): Promise<void> {
    await this.repo.save({
      id: document.id,
      admissionApplicationId: document.admissionApplicationId,
      type: document.type,
      storageKey: document.storageKey,
      originalFilename: document.originalFilename,
    });
  }

  private toDomain(row: AdmissionDocumentOrmEntity): AdmissionDocument {
    return new AdmissionDocument(
      row.id,
      row.admissionApplicationId,
      row.type,
      row.storageKey,
      row.originalFilename,
      row.uploadedAt.toISOString(),
    );
  }
}
