import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SurveyResponseRepositoryPort } from '../../application/ports/survey-response.repository.port';
import { SurveyResponse } from '../../domain/entities/survey-response.entity';
import { SurveyResponseOrmEntity } from '../entities/survey-response.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmSurveyResponseRepository extends SurveyResponseRepositoryPort {
  private readonly repo: Repository<SurveyResponseOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(SurveyResponseOrmEntity);
  }

  async findAllForSurvey(surveyId: string): Promise<SurveyResponse[]> {
    const rows = await this.repo.find({ where: { surveyId } });
    return rows.map((row) => this.toDomain(row));
  }

  async findBySurveyAndRespondent(
    surveyId: string,
    respondentId: string,
  ): Promise<SurveyResponse | null> {
    const row = await this.repo.findOne({ where: { surveyId, respondentId } });
    return row ? this.toDomain(row) : null;
  }

  async save(response: SurveyResponse): Promise<void> {
    await this.repo.save({
      id: response.id,
      surveyId: response.surveyId,
      respondentId: response.respondentId,
      selectedOption: response.selectedOption,
      respondedAt: new Date(response.respondedAt),
    });
  }

  private toDomain(row: SurveyResponseOrmEntity): SurveyResponse {
    return new SurveyResponse(
      row.id,
      row.surveyId,
      row.respondentId,
      row.selectedOption,
      row.respondedAt.toISOString(),
    );
  }
}
