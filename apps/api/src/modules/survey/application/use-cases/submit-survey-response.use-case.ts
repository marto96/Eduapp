import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SurveyRepositoryPort } from '../ports/survey.repository.port';
import { SurveyResponseRepositoryPort } from '../ports/survey-response.repository.port';
import { SurveyResponse, SurveyAnswer } from '../../domain/entities/survey-response.entity';

export interface SubmitSurveyResponseInput {
  surveyId: string;
  answers: SurveyAnswer[];
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
    if (survey.voidedAt) {
      throw new ConflictException('La encuesta fue anulada');
    }
    if (survey.isClosed()) {
      throw new ConflictException('La encuesta ya cerró');
    }
    if (input.answers.length !== survey.questions.length) {
      throw new BadRequestException('Debe responder todas las preguntas');
    }

    const questionById = new Map(survey.questions.map((q) => [q.id, q]));
    for (const answer of input.answers) {
      const question = questionById.get(answer.questionId);
      if (!question) {
        throw new BadRequestException(`La pregunta "${answer.questionId}" no pertenece a esta encuesta`);
      }
      if (!question.options.includes(answer.selectedOption)) {
        throw new BadRequestException('La opción elegida no pertenece a esta pregunta');
      }
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
      input.answers,
      new Date().toISOString(),
    );

    await this.responses.save(response);
    return response;
  }
}
