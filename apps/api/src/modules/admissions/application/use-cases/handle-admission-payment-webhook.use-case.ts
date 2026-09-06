import { Inject, Injectable, Logger } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from '../ports/admission-payment-attempt.repository.port';
import { PaymentGatewayPort } from '../../../finance/application/ports/payment-gateway.port';
import { SendTemplatedEmailUseCase } from '../../../email/application/use-cases/send-templated-email.use-case';

export interface AdmissionPaymentWebhookInput {
  event?: string;
  data?: { transaction?: { id?: string } };
}

/**
 * Mismo criterio que `HandlePaymentWebhookUseCase` de `finance`: el webhook
 * solo notifica que "algo pasó" — hay que consultar el estado real, y es
 * idempotente porque Wompi puede reintentar la notificación.
 */
@Injectable()
export class HandleAdmissionPaymentWebhookUseCase {
  private readonly logger = new Logger(HandleAdmissionPaymentWebhookUseCase.name);

  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    @Inject(AdmissionPaymentAttemptRepositoryPort) private readonly attempts: AdmissionPaymentAttemptRepositoryPort,
    @Inject(PaymentGatewayPort) private readonly gateway: PaymentGatewayPort,
    private readonly sendEmail: SendTemplatedEmailUseCase,
  ) {}

  async execute(input: AdmissionPaymentWebhookInput): Promise<void> {
    const transactionId = input.data?.transaction?.id;
    if (input.event !== 'transaction.updated' || !transactionId) return;

    const info = await this.gateway.getPaymentInfo(transactionId);
    if (!info.externalReference) return;

    const attempt = await this.attempts.findById(info.externalReference);
    if (!attempt) {
      this.logger.warn(`Webhook de admisión para un intento desconocido: ${info.externalReference}`);
      return;
    }

    if (attempt.status === 'approved') return;

    const application = await this.applications.findById(attempt.admissionApplicationId);

    if (info.status === 'approved') {
      attempt.approve();
      await this.attempts.save(attempt);

      if (application) {
        application.markPaid();
        await this.applications.save(application);
        await this.sendEmail.execute({
          type: 'pago_aprobado',
          to: application.guardianEmail,
          variables: { trackingCode: application.trackingCode },
        });
      }
    } else if (info.status === 'rejected') {
      attempt.reject();
      await this.attempts.save(attempt);

      if (application) {
        await this.sendEmail.execute({
          type: 'pago_rechazado',
          to: application.guardianEmail,
          variables: { trackingCode: application.trackingCode },
        });
      }
    }
  }
}
