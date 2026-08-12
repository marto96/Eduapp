import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PaymentAttemptRepositoryPort } from '../../application/ports/payment-attempt.repository.port';
import { PaymentAttempt } from '../../domain/entities/payment-attempt.entity';
import { PaymentAttemptOrmEntity } from '../entities/payment-attempt.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmPaymentAttemptRepository extends PaymentAttemptRepositoryPort {
  private readonly repo: Repository<PaymentAttemptOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(PaymentAttemptOrmEntity);
  }

  async findById(id: string): Promise<PaymentAttempt | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(attempt: PaymentAttempt): Promise<void> {
    await this.repo.save({
      id: attempt.id,
      chargeId: attempt.chargeId,
      guardianUserId: attempt.guardianUserId,
      gatewayPreferenceId: attempt.gatewayPreferenceId,
      amount: attempt.amount,
      status: attempt.status,
      createdAt: new Date(attempt.createdAt),
    });
  }

  private toDomain(row: PaymentAttemptOrmEntity): PaymentAttempt {
    return new PaymentAttempt(
      row.id,
      row.chargeId,
      row.guardianUserId,
      row.gatewayPreferenceId,
      row.amount,
      row.status,
      row.createdAt.toISOString(),
    );
  }
}
