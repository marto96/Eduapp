import { Inject, Injectable } from '@nestjs/common';
import { ChargeFilter, ChargeRepositoryPort } from '../ports/charge.repository.port';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { Charge } from '../../domain/entities/charge.entity';

export type ChargeStatus = 'pendiente' | 'parcial' | 'pagado';

export interface ChargeWithBalance extends Charge {
  paidAmount: number;
  balance: number;
  status: ChargeStatus;
}

export interface ListChargesInput extends ChargeFilter {
  status?: ChargeStatus;
}

@Injectable()
export class ListChargesUseCase {
  constructor(
    @Inject(ChargeRepositoryPort) private readonly charges: ChargeRepositoryPort,
    @Inject(PaymentRepositoryPort) private readonly payments: PaymentRepositoryPort,
  ) {}

  async execute(input?: ListChargesInput): Promise<ChargeWithBalance[]> {
    const charges = await this.charges.findAll(input);
    if (charges.length === 0) return [];

    const allPayments = await this.payments.findAll({ chargeIds: charges.map((c) => c.id) });
    const paidByCharge = new Map<string, number>();
    for (const payment of allPayments) {
      paidByCharge.set(payment.chargeId, (paidByCharge.get(payment.chargeId) ?? 0) + payment.amount);
    }

    const enriched = charges.map((charge) => {
      const paidAmount = paidByCharge.get(charge.id) ?? 0;
      const balance = charge.amount - paidAmount;
      const status: ChargeStatus = paidAmount === 0 ? 'pendiente' : balance > 0 ? 'parcial' : 'pagado';
      return { ...charge, paidAmount, balance, status } as ChargeWithBalance;
    });

    return input?.status ? enriched.filter((c) => c.status === input.status) : enriched;
  }
}
