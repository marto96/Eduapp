import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SurveyRepositoryPort } from '../ports/survey.repository.port';
import { Survey } from '../../domain/entities/survey.entity';

@Injectable()
export class RescheduleSurveyUseCase {
  constructor(@Inject(SurveyRepositoryPort) private readonly surveys: SurveyRepositoryPort) {}

  async execute(id: string, closesAt: string | null): Promise<Survey> {
    const survey = await this.surveys.findById(id);
    if (!survey) {
      throw new NotFoundException(`No existe la encuesta "${id}"`);
    }
    if (survey.voidedAt) {
      throw new ConflictException('No se puede editar una encuesta anulada');
    }

    survey.reschedule(closesAt);
    await this.surveys.save(survey);
    return survey;
  }
}
