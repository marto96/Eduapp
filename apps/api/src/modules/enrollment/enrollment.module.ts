import { Module } from '@nestjs/common';
import { EnrollmentsController } from './interface/controllers/enrollments.controller';
import { EnrollStudentUseCase } from './application/use-cases/enroll-student.use-case';
import { ListEnrollmentsUseCase } from './application/use-cases/list-enrollments.use-case';
import { EnrollmentRepositoryPort } from './application/ports/enrollment.repository.port';
import { TypeOrmEnrollmentRepository } from './infrastructure/repositories/typeorm-enrollment.repository';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [EnrollmentsController],
  providers: [
    EnrollStudentUseCase,
    ListEnrollmentsUseCase,
    { provide: EnrollmentRepositoryPort, useClass: TypeOrmEnrollmentRepository },
  ],
  exports: [EnrollmentRepositoryPort],
})
export class EnrollmentModule {}
