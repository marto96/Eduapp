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
      question: survey.question,
      options: survey.options,
      createdBy: survey.createdBy,
      createdAt: new Date(survey.createdAt),
    });
  }

  private toDomain(row: SurveyOrmEntity): Survey {
    return new Survey(row.id, row.question, row.options, row.createdBy, row.createdAt.toISOString());
  }
}
