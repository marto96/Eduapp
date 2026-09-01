import { Inject, Injectable } from '@nestjs/common';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { OverdueBalanceCheckerPort } from '../../../enrollment/application/ports/overdue-balance-checker.port';

@Injectable()
export class OverdueBalanceChecker extends OverdueBalanceCheckerPort {
  constructor(
    @Inject(ChargeRepositoryPort) private readonly charges: ChargeRepositoryPort,
    @Inject(PaymentRepositoryPort) private readonly payments: PaymentRepositoryPort,
  ) {
    super();
  }

  async hasOverdueBalance(enrollmentIds: string[]): Promise<boolean> {
    if (enrollmentIds.length === 0) return false;

    const charges = await this.charges.findAll({ enrollmentIds });
    if (charges.length === 0) return false;

    // convención ya usada en handle-payment-webhook.use-case.ts para "hoy" en el backend
    const today = new Date().toISOString().slice(0, 10);
    const overdueCandidates = charges.filter((c) => !c.voidedAt && c.dueDate < today);
    if (overdueCandidates.length === 0) return false;

    const allPayments = await this.payments.findAll({ chargeIds: overdueCandidates.map((c) => c.id) });
    const paidByCharge = new Map<string, number>();
    for (const payment of allPayments) {
      if (payment.voidedAt) continue;
      paidByCharge.set(payment.chargeId, (paidByCharge.get(payment.chargeId) ?? 0) + payment.amount);
    }

    return overdueCandidates.some((c) => c.computeBalance(paidByCharge.get(c.id) ?? 0) > 0);
  }
}
