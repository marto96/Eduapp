import { BankTransaction } from '../../domain/entities/bank-transaction.entity';

export interface BankTransactionFilter {
  matched?: boolean;
}

export abstract class BankTransactionRepositoryPort {
  abstract findAll(filter?: BankTransactionFilter): Promise<BankTransaction[]>;
  abstract findById(id: string): Promise<BankTransaction | null>;
  abstract findByMatchedPaymentId(paymentId: string): Promise<BankTransaction | null>;
  abstract save(transaction: BankTransaction): Promise<void>;
}
