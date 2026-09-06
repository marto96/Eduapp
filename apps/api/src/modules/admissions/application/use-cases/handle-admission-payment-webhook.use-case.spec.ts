// apps/api/src/modules/admissions/application/use-cases/handle-admission-payment-webhook.use-case.spec.ts
import { HandleAdmissionPaymentWebhookUseCase } from './handle-admission-payment-webhook.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from '../ports/admission-payment-attempt.repository.port';
import { PaymentGatewayPort } from '../../../finance/application/ports/payment-gateway.port';
import { SendTemplatedEmailUseCase } from '../../../email/application/use-cases/send-templated-email.use-case';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';
import { AdmissionPaymentAttempt } from '../../domain/entities/admission-payment-attempt.entity';

describe('HandleAdmissionPaymentWebhookUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const attempts: jest.Mocked<AdmissionPaymentAttemptRepositoryPort> = {
    findById: jest.fn(),
    save: jest.fn(),
  };
  const gateway: jest.Mocked<PaymentGatewayPort> = {
    createCheckoutPreference: jest.fn(),
    getPaymentInfo: jest.fn(),
  };

  const sendEmail = { execute: jest.fn() } as unknown as jest.Mocked<SendTemplatedEmailUseCase>;

  const useCase = new HandleAdmissionPaymentWebhookUseCase(applications, attempts, gateway, sendEmail);

  const buildApplication = () =>
    new AdmissionApplication(
      'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1',
      'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
      'pendiente_pago', 150000, null, null, null, null, null, null, '2026-01-01T00:00:00.000Z',
    );
  const buildAttempt = (status: 'pending' | 'approved' | 'rejected' = 'pending') =>
    new AdmissionPaymentAttempt('att-1', 'app-1', 'pref-1', 150000, status, '2026-01-01T00:00:00.000Z');

  beforeEach(() => jest.clearAllMocks());

  it('ignora notificaciones que no son de tipo transaction.updated', async () => {
    await useCase.execute({ event: 'transaction.created', data: { transaction: { id: 'txn-1' } } });
    expect(gateway.getPaymentInfo).not.toHaveBeenCalled();
  });

  it('ignora si el intento no existe (webhook de otro pago)', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-desconocido',
    });
    attempts.findById.mockResolvedValue(null);

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });
    expect(applications.save).not.toHaveBeenCalled();
  });

  it('no hace nada si el intento ya estaba approved (idempotencia)', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(buildAttempt('approved'));

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });
    expect(applications.save).not.toHaveBeenCalled();
    expect(attempts.save).not.toHaveBeenCalled();
  });

  it('con pago approved: marca el intento approved y la solicitud pendiente_entrevista, y envía el correo', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(buildAttempt('pending'));
    applications.findById.mockResolvedValue(buildApplication());

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(attempts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
    expect(applications.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pendiente_entrevista' }),
    );
    expect(sendEmail.execute).toHaveBeenCalledWith({
      type: 'pago_aprobado',
      to: 'maria@test.com',
      variables: { trackingCode: 'SOL-A8F3K2' },
    });
  });

  it('con pago rejected: marca el intento rejected, no toca la solicitud, y envía el correo', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'rejected',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(buildAttempt('pending'));
    applications.findById.mockResolvedValue(buildApplication());

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(attempts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }));
    expect(applications.save).not.toHaveBeenCalled();
    expect(sendEmail.execute).toHaveBeenCalledWith({
      type: 'pago_rechazado',
      to: 'maria@test.com',
      variables: { trackingCode: 'SOL-A8F3K2' },
    });
  });
});
