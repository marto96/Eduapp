import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { Payment } from '../../domain/entities/payment.entity';

@Injectable()
export class VoidPaymentUseCase {
  constructor(@Inject(PaymentRepositoryPort) private readonly payments: PaymentRepositoryPort) {}

  async execute(id: string): Promise<Payment> {
    const payment = await this.payments.findById(id);
    if (!payment) {
      throw new NotFoundException(`No existe el pago "${id}"`);
    }
    if (payment.voidedAt) {
      throw new ConflictException('El pago ya está anulado');
    }

    payment.markVoided();
    await this.payments.save(payment);
    return payment;
  }
}
