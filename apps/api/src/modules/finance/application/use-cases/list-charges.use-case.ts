import { Inject, Injectable } from '@nestjs/common';
import { ChargeFilter, ChargeRepositoryPort } from '../ports/charge.repository.port';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { Charge } from '../../domain/entities/charge.entity';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export type ChargeStatus = 'pendiente' | 'parcial' | 'pagado';

export interface ChargeWithBalance extends Charge {
  paidAmount: number;
  netAmount: number;
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
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(input: ListChargesInput | undefined, currentUser: JwtPayload): Promise<ChargeWithBalance[]> {
    const charges = await this.charges.findAll(input);
    if (charges.length === 0) return [];

    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    const visibleCharges =
      allowedEnrollmentIds === null
        ? charges
        : charges.filter((c) => allowedEnrollmentIds.has(c.enrollmentId));
    if (visibleCharges.length === 0) return [];

    const allPayments = await this.payments.findAll({ chargeIds: visibleCharges.map((c) => c.id) });
    const paidByCharge = new Map<string, number>();
    for (const payment of allPayments) {
      paidByCharge.set(payment.chargeId, (paidByCharge.get(payment.chargeId) ?? 0) + payment.amount);
    }

    const enriched = visibleCharges.map((charge) => {
      const paidAmount = paidByCharge.get(charge.id) ?? 0;
      const netAmount = charge.amount - charge.discountAmount;
      const balance = netAmount - paidAmount;
      // balance <= 0 cubre tanto "pagado con plata" como "cubierto por
      // completo con una beca/descuento, sin ningún pago registrado" —
      // antes de discountAmount alcanzaba con mirar paidAmount, ya no.
      const status: ChargeStatus = balance <= 0 ? 'pagado' : paidAmount > 0 ? 'parcial' : 'pendiente';
      return { ...charge, paidAmount, netAmount, balance, status } as ChargeWithBalance;
    });

    return input?.status ? enriched.filter((c) => c.status === input.status) : enriched;
  }
}
