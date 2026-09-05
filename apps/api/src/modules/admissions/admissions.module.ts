import { Module } from '@nestjs/common';
import { AdmissionPublicController } from './interface/controllers/admission-public.controller';
import { AdmissionWebhookController } from './interface/controllers/admission-webhook.controller';
import { AdmissionManagementController } from './interface/controllers/admission-management.controller';
import { CreateAdmissionApplicationUseCase } from './application/use-cases/create-admission-application.use-case';
import { HandleAdmissionPaymentWebhookUseCase } from './application/use-cases/handle-admission-payment-webhook.use-case';
import { GetAdmissionApplicationStatusUseCase } from './application/use-cases/get-admission-application-status.use-case';
import { ListAdmissionApplicationsUseCase } from './application/use-cases/list-admission-applications.use-case';
import { RecordAdmissionInterviewUseCase } from './application/use-cases/record-admission-interview.use-case';
import { AcceptAdmissionApplicationUseCase } from './application/use-cases/accept-admission-application.use-case';
import { RejectAdmissionApplicationUseCase } from './application/use-cases/reject-admission-application.use-case';
import { LinkAdmissionEnrollmentUseCase } from './application/use-cases/link-admission-enrollment.use-case';
import { ListOpenAdmissionYearsUseCase } from './application/use-cases/list-open-admission-years.use-case';
import { AdmissionApplicationRepositoryPort } from './application/ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from './application/ports/admission-payment-attempt.repository.port';
import { TypeOrmAdmissionApplicationRepository } from './infrastructure/repositories/typeorm-admission-application.repository';
import { TypeOrmAdmissionPaymentAttemptRepository } from './infrastructure/repositories/typeorm-admission-payment-attempt.repository';
import { AcademicModule } from '../academic/academic.module';
import { FinanceModule } from '../finance/finance.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [AcademicModule, FinanceModule, IdentityModule],
  controllers: [AdmissionPublicController, AdmissionWebhookController, AdmissionManagementController],
  providers: [
    CreateAdmissionApplicationUseCase,
    HandleAdmissionPaymentWebhookUseCase,
    GetAdmissionApplicationStatusUseCase,
    ListAdmissionApplicationsUseCase,
    RecordAdmissionInterviewUseCase,
    AcceptAdmissionApplicationUseCase,
    RejectAdmissionApplicationUseCase,
    LinkAdmissionEnrollmentUseCase,
    ListOpenAdmissionYearsUseCase,
    { provide: AdmissionApplicationRepositoryPort, useClass: TypeOrmAdmissionApplicationRepository },
    { provide: AdmissionPaymentAttemptRepositoryPort, useClass: TypeOrmAdmissionPaymentAttemptRepository },
  ],
})
export class AdmissionsModule {}
