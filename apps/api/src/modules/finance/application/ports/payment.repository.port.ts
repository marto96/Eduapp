import { Payment } from '../../domain/entities/payment.entity';

export interface PaymentFilter {
  chargeId?: string;
  chargeIds?: string[];
}

export abstract class PaymentRepositoryPort {
  abstract findAll(filter?: PaymentFilter): Promise<Payment[]>;
  abstract findById(id: string): Promise<Payment | null>;
  abstract save(payment: Payment): Promise<void>;
}
