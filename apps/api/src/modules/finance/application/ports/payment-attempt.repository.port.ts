import { PaymentAttempt } from '../../domain/entities/payment-attempt.entity';

export abstract class PaymentAttemptRepositoryPort {
  abstract findById(id: string): Promise<PaymentAttempt | null>;
  abstract save(attempt: PaymentAttempt): Promise<void>;
}
