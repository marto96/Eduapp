import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BankTransactionRepositoryPort } from '../ports/bank-transaction.repository.port';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { BankTransaction } from '../../domain/entities/bank-transaction.entity';

@Injectable()
export class MatchBankTransactionUseCase {
  constructor(
    @Inject(BankTransactionRepositoryPort) private readonly transactions: BankTransactionRepositoryPort,
    @Inject(PaymentRepositoryPort) private readonly payments: PaymentRepositoryPort,
  ) {}

  async execute(id: string, paymentId: string): Promise<BankTransaction> {
    const transaction = await this.transactions.findById(id);
    if (!transaction) {
      throw new NotFoundException(`No existe la transacción "${id}"`);
    }

    const payment = await this.payments.findById(paymentId);
    if (!payment) {
      throw new NotFoundException(`No existe el pago "${paymentId}"`);
    }

    const existingMatch = await this.transactions.findByMatchedPaymentId(paymentId);
    if (existingMatch) {
      throw new BadRequestException('Ese pago ya está conciliado con otra transacción');
    }

    try {
      transaction.match(paymentId);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    await this.transactions.save(transaction);
    return transaction;
  }
}
