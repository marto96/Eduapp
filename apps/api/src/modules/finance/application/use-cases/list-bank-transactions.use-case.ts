import { Inject, Injectable } from '@nestjs/common';
import {
  BankTransactionFilter,
  BankTransactionRepositoryPort,
} from '../ports/bank-transaction.repository.port';
import { BankTransaction } from '../../domain/entities/bank-transaction.entity';

@Injectable()
export class ListBankTransactionsUseCase {
  constructor(
    @Inject(BankTransactionRepositoryPort) private readonly transactions: BankTransactionRepositoryPort,
  ) {}

  execute(filter?: BankTransactionFilter): Promise<BankTransaction[]> {
    return this.transactions.findAll(filter);
  }
}
