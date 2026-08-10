import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { Payment, PaymentMethod } from '../../domain/entities/payment.entity';

export interface RecordPaymentInput {
  chargeId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  reference?: string;
}

@Injectable()
export class RecordPaymentUseCase {
  constructor(
    @Inject(ChargeRepositoryPort) private readonly charges: ChargeRepositoryPort,
    @Inject(PaymentRepositoryPort) private readonly payments: PaymentRepositoryPort,
  ) {}

  async execute(input: RecordPaymentInput): Promise<Payment> {
    const charge = await this.charges.findById(input.chargeId);
    if (!charge) {
      throw new NotFoundException(`No existe el cargo "${input.chargeId}"`);
    }

    const existingPayments = await this.payments.findAll({ chargeId: input.chargeId });
    const paidAmount = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = charge.amount - paidAmount;

    if (input.amount > balance) {
      throw new BadRequestException(
        `El pago excede el saldo pendiente del cargo (saldo: ${balance})`,
      );
    }

    let payment: Payment;
    try {
      payment = new Payment(
        randomUUID(),
        input.chargeId,
        input.amount,
        input.method,
        input.paidAt,
        input.reference,
      );
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    await this.payments.save(payment);
    return payment;
  }
}
