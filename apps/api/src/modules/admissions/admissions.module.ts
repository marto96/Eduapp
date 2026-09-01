import { Module } from '@nestjs/common';
import { AdmissionPublicController } from './interface/controllers/admission-public.controller';
import { AdmissionWebhookController } from './interface/controllers/admission-webhook.controller';
import { CreateAdmissionApplicationUseCase } from './application/use-cases/create-admission-application.use-case';
import { HandleAdmissionPaymentWebhookUseCase } from './application/use-cases/handle-admission-payment-webhook.use-case';
import { GetAdmissionApplicationStatusUseCase } from './application/use-cases/get-admission-application-status.use-case';
import { AdmissionApplicationRepositoryPort } from './application/ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from './application/ports/admission-payment-attempt.repository.port';
import { TypeOrmAdmissionApplicationRepository } from './infrastructure/repositories/typeorm-admission-application.repository';
import { TypeOrmAdmissionPaymentAttemptRepository } from './infrastructure/repositories/typeorm-admission-payment-attempt.repository';
import { AcademicModule } from '../academic/academic.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [AcademicModule, FinanceModule],
  controllers: [AdmissionPublicController, AdmissionWebhookController],
  providers: [
    CreateAdmissionApplicationUseCase,
    HandleAdmissionPaymentWebhookUseCase,
    GetAdmissionApplicationStatusUseCase,
    { provide: AdmissionApplicationRepositoryPort, useClass: TypeOrmAdmissionApplicationRepository },
    { provide: AdmissionPaymentAttemptRepositoryPort, useClass: TypeOrmAdmissionPaymentAttemptRepository },
  ],
})
export class AdmissionsModule {}
