import { Module } from '@nestjs/common';
import { ChargesController } from './interface/controllers/charges.controller';
import { PaymentsController } from './interface/controllers/payments.controller';
import { BankTransactionsController } from './interface/controllers/bank-transactions.controller';
import { PaymentWebhookController } from './interface/controllers/payment-webhook.controller';
import { FeeSchedulesController } from './interface/controllers/fee-schedules.controller';
import { CreateChargeUseCase } from './application/use-cases/create-charge.use-case';
import { ListChargesUseCase } from './application/use-cases/list-charges.use-case';
import { EditChargeUseCase } from './application/use-cases/edit-charge.use-case';
import { VoidChargeUseCase } from './application/use-cases/void-charge.use-case';
import { RecordPaymentUseCase } from './application/use-cases/record-payment.use-case';
import { ListPaymentsUseCase } from './application/use-cases/list-payments.use-case';
import { VoidPaymentUseCase } from './application/use-cases/void-payment.use-case';
import { ImportBankTransactionsUseCase } from './application/use-cases/import-bank-transactions.use-case';
import { ListBankTransactionsUseCase } from './application/use-cases/list-bank-transactions.use-case';
import { MatchBankTransactionUseCase } from './application/use-cases/match-bank-transaction.use-case';
import { CreatePaymentCheckoutUseCase } from './application/use-cases/create-payment-checkout.use-case';
import { HandlePaymentWebhookUseCase } from './application/use-cases/handle-payment-webhook.use-case';
import { CreateFeeScheduleUseCase } from './application/use-cases/create-fee-schedule.use-case';
import { EditFeeScheduleUseCase } from './application/use-cases/edit-fee-schedule.use-case';
import { ListFeeSchedulesUseCase } from './application/use-cases/list-fee-schedules.use-case';
import { ChargeRepositoryPort } from './application/ports/charge.repository.port';
import { PaymentRepositoryPort } from './application/ports/payment.repository.port';
import { BankTransactionRepositoryPort } from './application/ports/bank-transaction.repository.port';
import { PaymentAttemptRepositoryPort } from './application/ports/payment-attempt.repository.port';
import { PaymentGatewayPort } from './application/ports/payment-gateway.port';
import { RecordApprovedPaymentPort } from './application/ports/record-approved-payment.port';
import { FeeScheduleRepositoryPort } from './application/ports/fee-schedule.repository.port';
import { TypeOrmChargeRepository } from './infrastructure/repositories/typeorm-charge.repository';
import { TypeOrmPaymentRepository } from './infrastructure/repositories/typeorm-payment.repository';
import { TypeOrmBankTransactionRepository } from './infrastructure/repositories/typeorm-bank-transaction.repository';
import { TypeOrmPaymentAttemptRepository } from './infrastructure/repositories/typeorm-payment-attempt.repository';
import { TypeOrmRecordApprovedPayment } from './infrastructure/repositories/typeorm-record-approved-payment';
import { TypeOrmFeeScheduleRepository } from './infrastructure/repositories/typeorm-fee-schedule.repository';
import { MercadoPagoPaymentGateway } from './infrastructure/payment-gateway/mercadopago-payment-gateway';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { IdentityModule } from '../identity/identity.module';
import { AcademicModule } from '../academic/academic.module';

@Module({
  imports: [EnrollmentModule, IdentityModule, AcademicModule],
  controllers: [
    ChargesController,
    PaymentsController,
    BankTransactionsController,
    PaymentWebhookController,
    FeeSchedulesController,
  ],
  providers: [
    CreateChargeUseCase,
    ListChargesUseCase,
    EditChargeUseCase,
    VoidChargeUseCase,
    RecordPaymentUseCase,
    ListPaymentsUseCase,
    VoidPaymentUseCase,
    ImportBankTransactionsUseCase,
    ListBankTransactionsUseCase,
    MatchBankTransactionUseCase,
    CreatePaymentCheckoutUseCase,
    HandlePaymentWebhookUseCase,
    CreateFeeScheduleUseCase,
    EditFeeScheduleUseCase,
    ListFeeSchedulesUseCase,
    { provide: ChargeRepositoryPort, useClass: TypeOrmChargeRepository },
    { provide: PaymentRepositoryPort, useClass: TypeOrmPaymentRepository },
    { provide: BankTransactionRepositoryPort, useClass: TypeOrmBankTransactionRepository },
    { provide: PaymentAttemptRepositoryPort, useClass: TypeOrmPaymentAttemptRepository },
    { provide: PaymentGatewayPort, useClass: MercadoPagoPaymentGateway },
    { provide: RecordApprovedPaymentPort, useClass: TypeOrmRecordApprovedPayment },
    { provide: FeeScheduleRepositoryPort, useClass: TypeOrmFeeScheduleRepository },
  ],
  exports: [ChargeRepositoryPort, PaymentRepositoryPort, PaymentGatewayPort, FeeScheduleRepositoryPort],
})
export class FinanceModule {}
