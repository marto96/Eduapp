import { Module } from '@nestjs/common';
import { ChargesController } from './interface/controllers/charges.controller';
import { PaymentsController } from './interface/controllers/payments.controller';
import { BankTransactionsController } from './interface/controllers/bank-transactions.controller';
import { PaymentWebhookController } from './interface/controllers/payment-webhook.controller';
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
import { ChargeRepositoryPort } from './application/ports/charge.repository.port';
import { PaymentRepositoryPort } from './application/ports/payment.repository.port';
import { BankTransactionRepositoryPort } from './application/ports/bank-transaction.repository.port';
import { PaymentAttemptRepositoryPort } from './application/ports/payment-attempt.repository.port';
import { PaymentGatewayPort } from './application/ports/payment-gateway.port';
import { TypeOrmChargeRepository } from './infrastructure/repositories/typeorm-charge.repository';
import { TypeOrmPaymentRepository } from './infrastructure/repositories/typeorm-payment.repository';
import { TypeOrmBankTransactionRepository } from './infrastructure/repositories/typeorm-bank-transaction.repository';
import { TypeOrmPaymentAttemptRepository } from './infrastructure/repositories/typeorm-payment-attempt.repository';
import { MercadoPagoPaymentGateway } from './infrastructure/payment-gateway/mercadopago-payment-gateway';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [EnrollmentModule, IdentityModule],
  controllers: [ChargesController, PaymentsController, BankTransactionsController, PaymentWebhookController],
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
    { provide: ChargeRepositoryPort, useClass: TypeOrmChargeRepository },
    { provide: PaymentRepositoryPort, useClass: TypeOrmPaymentRepository },
    { provide: BankTransactionRepositoryPort, useClass: TypeOrmBankTransactionRepository },
    { provide: PaymentAttemptRepositoryPort, useClass: TypeOrmPaymentAttemptRepository },
    { provide: PaymentGatewayPort, useClass: MercadoPagoPaymentGateway },
  ],
  exports: [ChargeRepositoryPort, PaymentRepositoryPort],
})
export class FinanceModule {}
