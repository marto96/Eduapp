import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SurveyRepositoryPort } from '../ports/survey.repository.port';
import { SurveyResponseRepositoryPort } from '../ports/survey-response.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface SurveyResultsOutput {
  surveyId: string;
  question: string;
  options: string[];
  counts: Record<string, number>;
  totalResponses: number;
  respondedOption: string | null;
}

@Injectable()
export class GetSurveyResultsUseCase {
  constructor(
    @Inject(SurveyRepositoryPort) private readonly surveys: SurveyRepositoryPort,
    @Inject(SurveyResponseRepositoryPort) private readonly responses: SurveyResponseRepositoryPort,
  ) {}

  async execute(surveyId: string, currentUser: JwtPayload): Promise<SurveyResultsOutput> {
    const survey = await this.surveys.findById(surveyId);
    if (!survey) {
      throw new NotFoundException(`No existe la encuesta "${surveyId}"`);
    }

    const allResponses = await this.responses.findAllForSurvey(surveyId);
    const counts: Record<string, number> = {};
    for (const option of survey.options) {
      counts[option] = 0;
    }
    for (const response of allResponses) {
      counts[response.selectedOption] = (counts[response.selectedOption] ?? 0) + 1;
    }

    const mine = allResponses.find((r) => r.respondentId === currentUser.sub);

    return {
      surveyId: survey.id,
      question: survey.question,
      options: survey.options,
      counts,
      totalResponses: allResponses.length,
      respondedOption: mine ? mine.selectedOption : null,
    };
  }
}
