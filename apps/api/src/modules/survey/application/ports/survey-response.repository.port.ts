import { SurveyResponse } from '../../domain/entities/survey-response.entity';

export abstract class SurveyResponseRepositoryPort {
  abstract findAllForSurvey(surveyId: string): Promise<SurveyResponse[]>;
  abstract findBySurveyAndRespondent(
    surveyId: string,
    respondentId: string,
  ): Promise<SurveyResponse | null>;
  abstract save(response: SurveyResponse): Promise<void>;
}
