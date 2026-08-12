import { Module } from '@nestjs/common';
import { EvaluationsController } from './interface/controllers/evaluations.controller';
import { ScoresController } from './interface/controllers/scores.controller';
import { CreateEvaluationUseCase } from './application/use-cases/create-evaluation.use-case';
import { ListEvaluationsUseCase } from './application/use-cases/list-evaluations.use-case';
import { RecordScoresUseCase } from './application/use-cases/record-scores.use-case';
import { ListScoresUseCase } from './application/use-cases/list-scores.use-case';
import { EvaluationRepositoryPort } from './application/ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from './application/ports/grade-score.repository.port';
import { TypeOrmEvaluationRepository } from './infrastructure/repositories/typeorm-evaluation.repository';
import { TypeOrmGradeScoreRepository } from './infrastructure/repositories/typeorm-grade-score.repository';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
  imports: [EnrollmentModule],
  controllers: [EvaluationsController, ScoresController],
  providers: [
    CreateEvaluationUseCase,
    ListEvaluationsUseCase,
    RecordScoresUseCase,
    ListScoresUseCase,
    { provide: EvaluationRepositoryPort, useClass: TypeOrmEvaluationRepository },
    { provide: GradeScoreRepositoryPort, useClass: TypeOrmGradeScoreRepository },
  ],
  exports: [EvaluationRepositoryPort, GradeScoreRepositoryPort],
})
export class GradingModule {}
