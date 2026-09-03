import { Module } from '@nestjs/common';
import { EvaluationsController } from './interface/controllers/evaluations.controller';
import { ScoresController } from './interface/controllers/scores.controller';
import { GradeWeightConfigController } from './interface/controllers/grade-weight-config.controller';
import { CreateEvaluationUseCase } from './application/use-cases/create-evaluation.use-case';
import { ListEvaluationsUseCase } from './application/use-cases/list-evaluations.use-case';
import { RecordScoresUseCase } from './application/use-cases/record-scores.use-case';
import { ListScoresUseCase } from './application/use-cases/list-scores.use-case';
import { GetGradeWeightConfigUseCase } from './application/use-cases/get-grade-weight-config.use-case';
import { EditGradeWeightConfigUseCase } from './application/use-cases/edit-grade-weight-config.use-case';
import { GradeWeightConfigService } from './application/services/grade-weight-config.service';
import { EvaluationRepositoryPort } from './application/ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from './application/ports/grade-score.repository.port';
import { GradeWeightConfigRepositoryPort } from './application/ports/grade-weight-config.repository.port';
import { TypeOrmEvaluationRepository } from './infrastructure/repositories/typeorm-evaluation.repository';
import { TypeOrmGradeScoreRepository } from './infrastructure/repositories/typeorm-grade-score.repository';
import { TypeOrmGradeWeightConfigRepository } from './infrastructure/repositories/typeorm-grade-weight-config.repository';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
  imports: [EnrollmentModule],
  controllers: [EvaluationsController, ScoresController, GradeWeightConfigController],
  providers: [
    CreateEvaluationUseCase,
    ListEvaluationsUseCase,
    RecordScoresUseCase,
    ListScoresUseCase,
    GetGradeWeightConfigUseCase,
    EditGradeWeightConfigUseCase,
    GradeWeightConfigService,
    { provide: EvaluationRepositoryPort, useClass: TypeOrmEvaluationRepository },
    { provide: GradeScoreRepositoryPort, useClass: TypeOrmGradeScoreRepository },
    { provide: GradeWeightConfigRepositoryPort, useClass: TypeOrmGradeWeightConfigRepository },
  ],
  exports: [EvaluationRepositoryPort, GradeScoreRepositoryPort],
})
export class GradingModule {}
