export type AdmissionPaymentAttemptStatus = 'pending' | 'approved' | 'rejected';

/** Mismo rol que `PaymentAttempt` en `finance`, pero enlazado a una solicitud de admisión en vez de a un Charge. */
export class AdmissionPaymentAttempt {
  constructor(
    public readonly id: string,
    public readonly admissionApplicationId: string,
    public readonly gatewayPreferenceId: string,
    public readonly amount: number,
    public status: AdmissionPaymentAttemptStatus,
    public readonly createdAt: string,
  ) {}

  approve(): void {
    this.status = 'approved';
  }

  reject(): void {
    this.status = 'rejected';
  }
}
