import { Module } from '@nestjs/common';
import { SurveysController } from './interface/controllers/surveys.controller';
import { CreateSurveyUseCase } from './application/use-cases/create-survey.use-case';
import { ListSurveysUseCase } from './application/use-cases/list-surveys.use-case';
import { SubmitSurveyResponseUseCase } from './application/use-cases/submit-survey-response.use-case';
import { GetSurveyResultsUseCase } from './application/use-cases/get-survey-results.use-case';
import { RescheduleSurveyUseCase } from './application/use-cases/reschedule-survey.use-case';
import { VoidSurveyUseCase } from './application/use-cases/void-survey.use-case';
import { SurveyRepositoryPort } from './application/ports/survey.repository.port';
import { TypeOrmSurveyRepository } from './infrastructure/repositories/typeorm-survey.repository';
import { SurveyResponseRepositoryPort } from './application/ports/survey-response.repository.port';
import { TypeOrmSurveyResponseRepository } from './infrastructure/repositories/typeorm-survey-response.repository';

@Module({
  controllers: [SurveysController],
  providers: [
    CreateSurveyUseCase,
    ListSurveysUseCase,
    SubmitSurveyResponseUseCase,
    GetSurveyResultsUseCase,
    RescheduleSurveyUseCase,
    VoidSurveyUseCase,
    { provide: SurveyRepositoryPort, useClass: TypeOrmSurveyRepository },
    { provide: SurveyResponseRepositoryPort, useClass: TypeOrmSurveyResponseRepository },
  ],
})
export class SurveyModule {}
