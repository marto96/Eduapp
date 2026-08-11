import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SurveyRepositoryPort } from '../ports/survey.repository.port';
import { SurveyResponseRepositoryPort } from '../ports/survey-response.repository.port';
import { SurveyResponse } from '../../domain/entities/survey-response.entity';

export interface SubmitSurveyResponseInput {
  surveyId: string;
  selectedOption: string;
  respondentId: string;
}

@Injectable()
export class SubmitSurveyResponseUseCase {
  constructor(
    @Inject(SurveyRepositoryPort) private readonly surveys: SurveyRepositoryPort,
    @Inject(SurveyResponseRepositoryPort) private readonly responses: SurveyResponseRepositoryPort,
  ) {}

  async execute(input: SubmitSurveyResponseInput): Promise<SurveyResponse> {
    const survey = await this.surveys.findById(input.surveyId);
    if (!survey) {
      throw new NotFoundException(`No existe la encuesta "${input.surveyId}"`);
    }
    if (!survey.options.includes(input.selectedOption)) {
      throw new BadRequestException('La opción elegida no pertenece a esta encuesta');
    }

    const existing = await this.responses.findBySurveyAndRespondent(
      input.surveyId,
      input.respondentId,
    );
    if (existing) {
      throw new ConflictException('Ya respondiste esta encuesta');
    }

    const response = new SurveyResponse(
      randomUUID(),
      input.surveyId,
      input.respondentId,
      input.selectedOption,
      new Date().toISOString(),
    );

    await this.responses.save(response);
    return response;
  }
}
