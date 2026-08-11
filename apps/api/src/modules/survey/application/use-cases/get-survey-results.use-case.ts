import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SurveyRepositoryPort } from '../ports/survey.repository.port';
import { SurveyResponseRepositoryPort } from '../ports/survey-response.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface SurveyQuestionResult {
  questionId: string;
  text: string;
  options: string[];
  counts: Record<string, number>;
  myAnswer: string | null;
}

export interface SurveyResultsOutput {
  surveyId: string;
  closesAt: string | null;
  isClosed: boolean;
  voidedAt: string | null;
  totalRespondents: number;
  questions: SurveyQuestionResult[];
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
    const mine = allResponses.find((r) => r.respondentId === currentUser.sub);

    const questions = survey.questions.map((question) => {
      const counts: Record<string, number> = {};
      for (const option of question.options) {
        counts[option] = 0;
      }
      for (const response of allResponses) {
        const answer = response.answers.find((a) => a.questionId === question.id);
        if (answer) {
          counts[answer.selectedOption] = (counts[answer.selectedOption] ?? 0) + 1;
        }
      }
      const myAnswer = mine?.answers.find((a) => a.questionId === question.id)?.selectedOption ?? null;

      return {
        questionId: question.id,
        text: question.text,
        options: question.options,
        counts,
        myAnswer,
      };
    });

    return {
      surveyId: survey.id,
      closesAt: survey.closesAt,
      isClosed: survey.isClosed(),
      voidedAt: survey.voidedAt,
      totalRespondents: allResponses.length,
      questions,
    };
  }
}
