import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RecordApprovedPaymentPort } from '../../application/ports/record-approved-payment.port';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentAttempt } from '../../domain/entities/payment-attempt.entity';
import { PaymentOrmEntity } from '../entities/payment.orm-entity';
import { PaymentAttemptOrmEntity } from '../entities/payment-attempt.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmRecordApprovedPayment extends RecordApprovedPaymentPort {
  constructor(@Inject(TENANT_DATA_SOURCE) private readonly dataSource: DataSource) {
    super();
  }

  async execute(payment: Payment, attempt: PaymentAttempt): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(PaymentOrmEntity).save({
        id: payment.id,
        chargeId: payment.chargeId,
        amount: payment.amount,
        method: payment.method,
        paidAt: payment.paidAt,
        reference: payment.reference ?? null,
        voidedAt: payment.voidedAt ? new Date(payment.voidedAt) : null,
      });
      await manager.getRepository(PaymentAttemptOrmEntity).save({
        id: attempt.id,
        chargeId: attempt.chargeId,
        guardianUserId: attempt.guardianUserId,
        gatewayPreferenceId: attempt.gatewayPreferenceId,
        amount: attempt.amount,
        status: attempt.status,
        createdAt: new Date(attempt.createdAt),
      });
    });
  }
}
