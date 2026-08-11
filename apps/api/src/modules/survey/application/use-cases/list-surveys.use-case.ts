import { Inject, Injectable } from '@nestjs/common';
import { SurveyRepositoryPort } from '../ports/survey.repository.port';
import { Survey } from '../../domain/entities/survey.entity';

@Injectable()
export class ListSurveysUseCase {
  constructor(@Inject(SurveyRepositoryPort) private readonly surveys: SurveyRepositoryPort) {}

  async execute(): Promise<Survey[]> {
    return this.surveys.findAll();
  }
}
