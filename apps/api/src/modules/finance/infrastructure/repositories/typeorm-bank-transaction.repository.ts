import { Inject, Injectable } from '@nestjs/common';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import {
  BankTransactionFilter,
  BankTransactionRepositoryPort,
} from '../../application/ports/bank-transaction.repository.port';
import { BankTransaction } from '../../domain/entities/bank-transaction.entity';
import { BankTransactionOrmEntity } from '../entities/bank-transaction.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmBankTransactionRepository extends BankTransactionRepositoryPort {
  private readonly repo: Repository<BankTransactionOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(BankTransactionOrmEntity);
  }

  async findAll(filter?: BankTransactionFilter): Promise<BankTransaction[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.matched === true && { matchedPaymentId: Not(IsNull()) }),
        ...(filter?.matched === false && { matchedPaymentId: IsNull() }),
      },
      order: { date: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<BankTransaction | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByMatchedPaymentId(paymentId: string): Promise<BankTransaction | null> {
    const row = await this.repo.findOne({ where: { matchedPaymentId: paymentId } });
    return row ? this.toDomain(row) : null;
  }

  async save(transaction: BankTransaction): Promise<void> {
    await this.repo.save({
      id: transaction.id,
      date: transaction.date,
      amount: transaction.amount,
      description: transaction.description,
      importedAt: new Date(transaction.importedAt),
      matchedPaymentId: transaction.matchedPaymentId,
    });
  }

  private toDomain(row: BankTransactionOrmEntity): BankTransaction {
    return new BankTransaction(
      row.id,
      row.date,
      Number(row.amount),
      row.description,
      row.importedAt.toISOString(),
      row.matchedPaymentId,
    );
  }
}
