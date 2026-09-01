import { Inject, Injectable, Logger } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from '../ports/admission-payment-attempt.repository.port';
import { PaymentGatewayPort } from '../../../finance/application/ports/payment-gateway.port';

export interface AdmissionPaymentWebhookInput {
  type?: string;
  data?: { id?: string };
}

/**
 * Mismo criterio que `HandlePaymentWebhookUseCase` de `finance`: el webhook
 * solo notifica que "algo pasó" — hay que consultar el estado real, y es
 * idempotente porque MercadoPago puede reintentar la notificación.
 */
@Injectable()
export class HandleAdmissionPaymentWebhookUseCase {
  private readonly logger = new Logger(HandleAdmissionPaymentWebhookUseCase.name);

  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    @Inject(AdmissionPaymentAttemptRepositoryPort) private readonly attempts: AdmissionPaymentAttemptRepositoryPort,
    @Inject(PaymentGatewayPort) private readonly gateway: PaymentGatewayPort,
  ) {}

  async execute(input: AdmissionPaymentWebhookInput): Promise<void> {
    if (input.type !== 'payment' || !input.data?.id) return;

    const info = await this.gateway.getPaymentInfo(input.data.id);
    if (!info.externalReference) return;

    const attempt = await this.attempts.findById(info.externalReference);
    if (!attempt) {
      this.logger.warn(`Webhook de admisión para un intento desconocido: ${info.externalReference}`);
      return;
    }

    if (attempt.status === 'approved') return;

    if (info.status === 'approved') {
      attempt.approve();
      await this.attempts.save(attempt);

      const application = await this.applications.findById(attempt.admissionApplicationId);
      if (application) {
        application.markPaid();
        await this.applications.save(application);
      }
    } else if (info.status === 'rejected') {
      attempt.reject();
      await this.attempts.save(attempt);
    }
  }
}
