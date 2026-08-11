import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SurveyRepositoryPort } from '../ports/survey.repository.port';
import { Survey } from '../../domain/entities/survey.entity';

@Injectable()
export class VoidSurveyUseCase {
  constructor(@Inject(SurveyRepositoryPort) private readonly surveys: SurveyRepositoryPort) {}

  async execute(id: string): Promise<Survey> {
    const survey = await this.surveys.findById(id);
    if (!survey) {
      throw new NotFoundException(`No existe la encuesta "${id}"`);
    }
    if (survey.voidedAt) {
      throw new ConflictException('La encuesta ya está anulada');
    }

    survey.markVoided();
    await this.surveys.save(survey);
    return survey;
  }
}
