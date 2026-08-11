import { Survey } from '../../domain/entities/survey.entity';

export abstract class SurveyRepositoryPort {
  abstract findAll(): Promise<Survey[]>;
  abstract findById(id: string): Promise<Survey | null>;
  abstract save(survey: Survey): Promise<void>;
}
