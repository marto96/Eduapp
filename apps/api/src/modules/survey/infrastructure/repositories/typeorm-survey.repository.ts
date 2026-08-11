import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SurveyRepositoryPort } from '../../application/ports/survey.repository.port';
import { Survey } from '../../domain/entities/survey.entity';
import { SurveyOrmEntity } from '../entities/survey.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmSurveyRepository extends SurveyRepositoryPort {
  private readonly repo: Repository<SurveyOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(SurveyOrmEntity);
  }

  async findAll(): Promise<Survey[]> {
    const rows = await this.repo.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Survey | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(survey: Survey): Promise<void> {
    await this.repo.save({
      id: survey.id,
      questions: survey.questions,
      closesAt: survey.closesAt ? new Date(survey.closesAt) : null,
      editedAt: survey.editedAt ? new Date(survey.editedAt) : null,
      voidedAt: survey.voidedAt ? new Date(survey.voidedAt) : null,
      createdBy: survey.createdBy,
      createdAt: new Date(survey.createdAt),
    });
  }

  private toDomain(row: SurveyOrmEntity): Survey {
    return new Survey(
      row.id,
      row.questions,
      row.createdBy,
      row.createdAt.toISOString(),
      row.closesAt ? row.closesAt.toISOString() : null,
      row.editedAt ? row.editedAt.toISOString() : null,
      row.voidedAt ? row.voidedAt.toISOString() : null,
    );
  }
}
