import { Inject, Injectable } from '@nestjs/common';
import { ChargeRepositoryPort } from '../../../finance/application/ports/charge.repository.port';
import { PaymentRepositoryPort } from '../../../finance/application/ports/payment.repository.port';

export interface FinanceReportRow {
  month: string; // YYYY-MM, derivado de dueDate del cargo
  concept: string;
  charged: number;
  collected: number;
  pending: number;
}

export interface GetFinanceReportInput {
  from: string;
  to: string;
}

/**
 * Mismo cálculo de `balance` que `ListChargesUseCase` (netAmount - pagos no
 * anulados), agregado por mes+concepto en vez de devolver un registro por
 * cargo.
 */
@Injectable()
export class GetFinanceReportUseCase {
  constructor(
    @Inject(ChargeRepositoryPort) private readonly charges: ChargeRepositoryPort,
    @Inject(PaymentRepositoryPort) private readonly payments: PaymentRepositoryPort,
  ) {}

  async execute(input: GetFinanceReportInput): Promise<FinanceReportRow[]> {
    const allCharges = await this.charges.findAll();
    const chargesInRange = allCharges.filter(
      (c) => !c.voidedAt && c.dueDate >= input.from && c.dueDate <= input.to,
    );
    if (chargesInRange.length === 0) return [];

    const allPayments = await this.payments.findAll({
      chargeIds: chargesInRange.map((c) => c.id),
    });
    const paidByCharge = new Map<string, number>();
    for (const payment of allPayments) {
      if (payment.voidedAt) continue;
      paidByCharge.set(payment.chargeId, (paidByCharge.get(payment.chargeId) ?? 0) + payment.amount);
    }

    const byKey = new Map<string, FinanceReportRow>();
    for (const charge of chargesInRange) {
      const month = charge.dueDate.slice(0, 7);
      const key = `${month}:${charge.concept}`;
      const netAmount = charge.amount - charge.discountAmount;
      const paidAmount = paidByCharge.get(charge.id) ?? 0;

      const row = byKey.get(key) ?? { month, concept: charge.concept, charged: 0, collected: 0, pending: 0 };
      row.charged += netAmount;
      row.collected += Math.min(paidAmount, netAmount);
      row.pending += Math.max(netAmount - paidAmount, 0);
      byKey.set(key, row);
    }

    return Array.from(byKey.values()).sort((a, b) => a.month.localeCompare(b.month));
  }
}
