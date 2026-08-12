export type PaymentAttemptStatus = 'pending' | 'approved' | 'rejected';

export class PaymentAttempt {
  constructor(
    public readonly id: string,
    public readonly chargeId: string,
    public readonly guardianUserId: string,
    public readonly gatewayPreferenceId: string,
    public readonly amount: number,
    public status: PaymentAttemptStatus,
    public readonly createdAt: string,
  ) {}

  approve(): void {
    this.status = 'approved';
  }

  reject(): void {
    this.status = 'rejected';
  }
}
