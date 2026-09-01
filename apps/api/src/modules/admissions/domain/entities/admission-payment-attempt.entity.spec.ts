import { AdmissionPaymentAttempt } from './admission-payment-attempt.entity';

describe('AdmissionPaymentAttempt', () => {
  const build = () =>
    new AdmissionPaymentAttempt('att-1', 'app-1', 'pref-1', 150000, 'pending', '2026-01-01T00:00:00.000Z');

  it('approve() cambia el status a approved', () => {
    const attempt = build();
    attempt.approve();
    expect(attempt.status).toBe('approved');
  });

  it('reject() cambia el status a rejected', () => {
    const attempt = build();
    attempt.reject();
    expect(attempt.status).toBe('rejected');
  });
});
