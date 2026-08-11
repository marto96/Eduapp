import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { SurveyRepositoryPort } from '../ports/survey.repository.port';
import { Survey } from '../../domain/entities/survey.entity';

export interface CreateSurveyQuestionInput {
  text: string;
  options: string[];
}

export interface CreateSurveyInput {
  questions: CreateSurveyQuestionInput[];
  createdBy: string;
  closesAt?: string;
}

@Injectable()
export class CreateSurveyUseCase {
  constructor(@Inject(SurveyRepositoryPort) private readonly surveys: SurveyRepositoryPort) {}

  async execute(input: CreateSurveyInput): Promise<Survey> {
    const questions = input.questions.map((q) => ({
      id: randomUUID(),
      text: q.text,
      options: q.options,
    }));

    const survey = new Survey(
      randomUUID(),
      questions,
      input.createdBy,
      new Date().toISOString(),
      input.closesAt ?? null,
    );

    await this.surveys.save(survey);
    return survey;
  }
}
