import { Module } from '@nestjs/common';
import { ChargeRepositoryPort } from './application/ports/charge.repository.port';
import { PaymentRepositoryPort } from './application/ports/payment.repository.port';
import { OverdueBalanceCheckerPort } from '../enrollment/application/ports/overdue-balance-checker.port';
import { TypeOrmChargeRepository } from './infrastructure/repositories/typeorm-charge.repository';
import { TypeOrmPaymentRepository } from './infrastructure/repositories/typeorm-payment.repository';
import { OverdueBalanceChecker } from './application/services/overdue-balance-checker';

/**
 * Módulo hoja separado de `FinanceModule` a propósito: `FinanceModule` ya
 * importa `EnrollmentModule`, y `EnrollmentModule` necesita este checker —
 * si viviera dentro de `FinanceModule` sería una dependencia circular entre
 * módulos. Registra sus propios bindings de los mismos repositorios (son
 * wrappers sin estado sobre `TENANT_DATA_SOURCE`, sin costo real de
 * duplicarlos) y no importa `EnrollmentModule`, así el ciclo no existe.
 */
@Module({
  providers: [
    { provide: ChargeRepositoryPort, useClass: TypeOrmChargeRepository },
    { provide: PaymentRepositoryPort, useClass: TypeOrmPaymentRepository },
    { provide: OverdueBalanceCheckerPort, useClass: OverdueBalanceChecker },
  ],
  exports: [OverdueBalanceCheckerPort],
})
export class OverdueBalanceModule {}
