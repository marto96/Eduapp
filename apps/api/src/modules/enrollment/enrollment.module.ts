import { Module } from '@nestjs/common';
import { EnrollmentsController } from './interface/controllers/enrollments.controller';
import { EnrollStudentUseCase } from './application/use-cases/enroll-student.use-case';
import { ListEnrollmentsUseCase } from './application/use-cases/list-enrollments.use-case';
import { WithdrawEnrollmentUseCase } from './application/use-cases/withdraw-enrollment.use-case';
import { CompleteEnrollmentUseCase } from './application/use-cases/complete-enrollment.use-case';
import { ReassignEnrollmentSectionUseCase } from './application/use-cases/reassign-enrollment-section.use-case';
import { EnrollmentAccessService } from './application/services/enrollment-access.service';
import { EnrollmentRepositoryPort } from './application/ports/enrollment.repository.port';
import { TypeOrmEnrollmentRepository } from './infrastructure/repositories/typeorm-enrollment.repository';
import { IdentityModule } from '../identity/identity.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { OverdueBalanceModule } from '../finance/overdue-balance.module';
import { AcademicModule } from '../academic/academic.module';

@Module({
  imports: [IdentityModule, ScheduleModule, OverdueBalanceModule, AcademicModule],
  controllers: [EnrollmentsController],
  providers: [
    EnrollStudentUseCase,
    ListEnrollmentsUseCase,
    WithdrawEnrollmentUseCase,
    CompleteEnrollmentUseCase,
    ReassignEnrollmentSectionUseCase,
    EnrollmentAccessService,
    { provide: EnrollmentRepositoryPort, useClass: TypeOrmEnrollmentRepository },
  ],
  exports: [EnrollmentRepositoryPort, EnrollmentAccessService],
})
export class EnrollmentModule {}
