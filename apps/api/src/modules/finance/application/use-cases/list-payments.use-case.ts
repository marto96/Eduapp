import { Inject, Injectable } from '@nestjs/common';
import { PaymentFilter, PaymentRepositoryPort } from '../ports/payment.repository.port';
import { Payment } from '../../domain/entities/payment.entity';

@Injectable()
export class ListPaymentsUseCase {
  constructor(@Inject(PaymentRepositoryPort) private readonly payments: PaymentRepositoryPort) {}

  async execute(filter?: PaymentFilter): Promise<Payment[]> {
    return this.payments.findAll(filter);
  }
}
