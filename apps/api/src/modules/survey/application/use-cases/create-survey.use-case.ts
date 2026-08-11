import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { SurveyRepositoryPort } from '../ports/survey.repository.port';
import { Survey } from '../../domain/entities/survey.entity';

export interface CreateSurveyInput {
  question: string;
  options: string[];
  createdBy: string;
}

@Injectable()
export class CreateSurveyUseCase {
  constructor(@Inject(SurveyRepositoryPort) private readonly surveys: SurveyRepositoryPort) {}

  async execute(input: CreateSurveyInput): Promise<Survey> {
    const survey = new Survey(
      randomUUID(),
      input.question,
      input.options,
      input.createdBy,
      new Date().toISOString(),
    );

    await this.surveys.save(survey);
    return survey;
  }
}
