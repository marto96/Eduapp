import { Inject, Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { PaymentFilter, PaymentRepositoryPort } from '../../application/ports/payment.repository.port';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentOrmEntity } from '../entities/payment.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmPaymentRepository extends PaymentRepositoryPort {
  private readonly repo: Repository<PaymentOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(PaymentOrmEntity);
  }

  async findAll(filter?: PaymentFilter): Promise<Payment[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.chargeId && { chargeId: filter.chargeId }),
        ...(filter?.chargeIds && { chargeId: In(filter.chargeIds) }),
      },
      order: { paidAt: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Payment | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(payment: Payment): Promise<void> {
    await this.repo.save({
      id: payment.id,
      chargeId: payment.chargeId,
      amount: payment.amount,
      method: payment.method,
      paidAt: payment.paidAt,
      reference: payment.reference ?? null,
      voidedAt: payment.voidedAt ? new Date(payment.voidedAt) : null,
    });
  }

  private toDomain(row: PaymentOrmEntity): Payment {
    return new Payment(
      row.id,
      row.chargeId,
      row.amount,
      row.method,
      row.paidAt,
      row.reference ?? undefined,
      row.voidedAt ? row.voidedAt.toISOString() : null,
    );
  }
}
