import { Module } from '@nestjs/common';
import { EvaluationsController } from './interface/controllers/evaluations.controller';
import { ScoresController } from './interface/controllers/scores.controller';
import { GradeWeightConfigController } from './interface/controllers/grade-weight-config.controller';
import { GradebookController } from './interface/controllers/gradebook.controller';
import { CreateEvaluationUseCase } from './application/use-cases/create-evaluation.use-case';
import { ListEvaluationsUseCase } from './application/use-cases/list-evaluations.use-case';
import { RecordScoresUseCase } from './application/use-cases/record-scores.use-case';
import { ListScoresUseCase } from './application/use-cases/list-scores.use-case';
import { GetGradeWeightConfigUseCase } from './application/use-cases/get-grade-weight-config.use-case';
import { EditGradeWeightConfigUseCase } from './application/use-cases/edit-grade-weight-config.use-case';
import { ListGradebookStudentsUseCase } from './application/use-cases/list-gradebook-students.use-case';
import { GetGradebookUseCase } from './application/use-cases/get-gradebook.use-case';
import { GetSubjectPeriodDetailUseCase } from './application/use-cases/get-subject-period-detail.use-case';
import { CreateGradeUseCase } from './application/use-cases/create-grade.use-case';
import { GradeWeightConfigService } from './application/services/grade-weight-config.service';
import { EvaluationRepositoryPort } from './application/ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from './application/ports/grade-score.repository.port';
import { GradeWeightConfigRepositoryPort } from './application/ports/grade-weight-config.repository.port';
import { GradebookRepositoryPort } from './application/ports/gradebook.repository.port';
import { TypeOrmEvaluationRepository } from './infrastructure/repositories/typeorm-evaluation.repository';
import { TypeOrmGradeScoreRepository } from './infrastructure/repositories/typeorm-grade-score.repository';
import { TypeOrmGradeWeightConfigRepository } from './infrastructure/repositories/typeorm-grade-weight-config.repository';
import { TypeOrmGradebookRepository } from './infrastructure/repositories/typeorm-gradebook.repository';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { AcademicModule } from '../academic/academic.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [EnrollmentModule, AcademicModule, AttendanceModule, ScheduleModule, IdentityModule],
  controllers: [EvaluationsController, ScoresController, GradeWeightConfigController, GradebookController],
  providers: [
    CreateEvaluationUseCase,
    ListEvaluationsUseCase,
    RecordScoresUseCase,
    ListScoresUseCase,
    GetGradeWeightConfigUseCase,
    EditGradeWeightConfigUseCase,
    ListGradebookStudentsUseCase,
    GetGradebookUseCase,
    GetSubjectPeriodDetailUseCase,
    CreateGradeUseCase,
    GradeWeightConfigService,
    { provide: EvaluationRepositoryPort, useClass: TypeOrmEvaluationRepository },
    { provide: GradeScoreRepositoryPort, useClass: TypeOrmGradeScoreRepository },
    { provide: GradeWeightConfigRepositoryPort, useClass: TypeOrmGradeWeightConfigRepository },
    { provide: GradebookRepositoryPort, useClass: TypeOrmGradebookRepository },
  ],
  exports: [EvaluationRepositoryPort, GradeScoreRepositoryPort],
})
export class GradingModule {}
