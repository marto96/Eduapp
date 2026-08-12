import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { BankTransactionRepositoryPort } from '../ports/bank-transaction.repository.port';
import { BankTransaction } from '../../domain/entities/bank-transaction.entity';

/**
 * Parseo manual de un CSV con columnas fijas `date,amount,description` —
 * formato simple, no amerita una librería nueva. Primera línea siempre se
 * asume header y se descarta.
 */
@Injectable()
export class ImportBankTransactionsUseCase {
  constructor(
    @Inject(BankTransactionRepositoryPort) private readonly transactions: BankTransactionRepositoryPort,
  ) {}

  async execute(csvContent: string): Promise<BankTransaction[]> {
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      throw new BadRequestException('El CSV debe tener un header y al menos una fila');
    }

    const rows = lines.slice(1);
    const imported: BankTransaction[] = [];

    for (const row of rows) {
      const [date, amountRaw, ...descriptionParts] = row.split(',');
      const amount = Number(amountRaw);
      if (!date || Number.isNaN(amount) || descriptionParts.length === 0) {
        throw new BadRequestException(`Fila inválida: "${row}"`);
      }

      let transaction: BankTransaction;
      try {
        transaction = new BankTransaction(
          randomUUID(),
          date.trim(),
          amount,
          descriptionParts.join(',').trim(),
          new Date().toISOString(),
        );
      } catch (err) {
        throw new BadRequestException((err as Error).message);
      }

      await this.transactions.save(transaction);
      imported.push(transaction);
    }

    return imported;
  }
}
