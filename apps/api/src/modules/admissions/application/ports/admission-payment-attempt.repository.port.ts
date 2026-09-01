import { AdmissionPaymentAttempt } from '../../domain/entities/admission-payment-attempt.entity';

export abstract class AdmissionPaymentAttemptRepositoryPort {
  abstract findById(id: string): Promise<AdmissionPaymentAttempt | null>;
  abstract save(attempt: AdmissionPaymentAttempt): Promise<void>;
}
