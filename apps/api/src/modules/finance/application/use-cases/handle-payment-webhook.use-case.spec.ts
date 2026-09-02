import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case';
import { PaymentAttemptRepositoryPort } from '../ports/payment-attempt.repository.port';
import { RecordApprovedPaymentPort } from '../ports/record-approved-payment.port';
import { PaymentGatewayPort } from '../ports/payment-gateway.port';
import { PaymentAttempt } from '../../domain/entities/payment-attempt.entity';
import { Payment } from '../../domain/entities/payment.entity';

describe('HandlePaymentWebhookUseCase', () => {
  const attempts: jest.Mocked<PaymentAttemptRepositoryPort> = {
    findById: jest.fn(),
    save: jest.fn(),
  };
  const recordApprovedPayment: jest.Mocked<RecordApprovedPaymentPort> = {
    execute: jest.fn(),
  };
  const gateway: jest.Mocked<PaymentGatewayPort> = {
    createCheckoutPreference: jest.fn(),
    getPaymentInfo: jest.fn(),
  };

  const useCase = new HandlePaymentWebhookUseCase(attempts, recordApprovedPayment, gateway);

  const pendingAttempt = () =>
    new PaymentAttempt('att-1', 'charge-1', 'guardian-1', 'pref-1', 100, 'pending', '2026-01-01T00:00:00.000Z');

  beforeEach(() => jest.clearAllMocks());

  it('ignora notificaciones que no son de tipo transaction.updated', async () => {
    await useCase.execute({ event: 'transaction.created', data: { transaction: { id: '1' } } });

    expect(gateway.getPaymentInfo).not.toHaveBeenCalled();
  });

  it('ignora si el intento de pago no existe', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-unknown',
    });
    attempts.findById.mockResolvedValue(null);

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(recordApprovedPayment.execute).not.toHaveBeenCalled();
    expect(attempts.save).not.toHaveBeenCalled();
  });

  it('es idempotente: no vuelve a registrar el pago si el intento ya está aprobado', async () => {
    const approved = pendingAttempt();
    approved.approve();
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(approved);

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(recordApprovedPayment.execute).not.toHaveBeenCalled();
    expect(attempts.save).not.toHaveBeenCalled();
  });

  it('registra el pago y aprueba el intento de forma atómica cuando el gateway confirma el pago', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(pendingAttempt());

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(recordApprovedPayment.execute).toHaveBeenCalledTimes(1);
    const [payment, attempt] = recordApprovedPayment.execute.mock.calls[0] as [Payment, PaymentAttempt];
    expect(payment.chargeId).toBe('charge-1');
    expect(payment.amount).toBe(100);
    expect(attempt.status).toBe('approved');
    // el rechazo por separado no debe tocar la ruta transaccional de pago aprobado
    expect(attempts.save).not.toHaveBeenCalled();
  });

  it('marca el intento como rechazado sin registrar ningún pago cuando el gateway lo rechaza', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'rejected',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(pendingAttempt());

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(recordApprovedPayment.execute).not.toHaveBeenCalled();
    expect(attempts.save).toHaveBeenCalledTimes(1);
    const [savedAttempt] = attempts.save.mock.calls[0] as [PaymentAttempt];
    expect(savedAttempt.status).toBe('rejected');
  });
});
