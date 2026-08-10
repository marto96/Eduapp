import { Module } from '@nestjs/common';
import { ChargesController } from './interface/controllers/charges.controller';
import { PaymentsController } from './interface/controllers/payments.controller';
import { CreateChargeUseCase } from './application/use-cases/create-charge.use-case';
import { ListChargesUseCase } from './application/use-cases/list-charges.use-case';
import { RecordPaymentUseCase } from './application/use-cases/record-payment.use-case';
import { ListPaymentsUseCase } from './application/use-cases/list-payments.use-case';
import { ChargeRepositoryPort } from './application/ports/charge.repository.port';
import { PaymentRepositoryPort } from './application/ports/payment.repository.port';
import { TypeOrmChargeRepository } from './infrastructure/repositories/typeorm-charge.repository';
import { TypeOrmPaymentRepository } from './infrastructure/repositories/typeorm-payment.repository';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
  imports: [EnrollmentModule],
  controllers: [ChargesController, PaymentsController],
  providers: [
    CreateChargeUseCase,
    ListChargesUseCase,
    RecordPaymentUseCase,
    ListPaymentsUseCase,
    { provide: ChargeRepositoryPort, useClass: TypeOrmChargeRepository },
    { provide: PaymentRepositoryPort, useClass: TypeOrmPaymentRepository },
  ],
})
export class FinanceModule {}
