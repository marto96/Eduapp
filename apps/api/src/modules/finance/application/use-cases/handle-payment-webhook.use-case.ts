import { randomUUID } from 'node:crypto';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PaymentAttemptRepositoryPort } from '../ports/payment-attempt.repository.port';
import { RecordApprovedPaymentPort } from '../ports/record-approved-payment.port';
import { PaymentGatewayPort } from '../ports/payment-gateway.port';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { Payment, PaymentMethod } from '../../domain/entities/payment.entity';
import { CompleteDocumentPaymentUseCase } from '../../../documents/application/use-cases/complete-document-payment.use-case';

export interface PaymentWebhookInput {
  event?: string;
  data?: { transaction?: { id?: string } };
}

function mapPaymentMethod(wompiPaymentMethodType: string): PaymentMethod {
  if (['BANCOLOMBIA_COLLECT'].includes(wompiPaymentMethodType)) return 'efectivo';
  if (['PSE', 'BANCOLOMBIA_TRANSFER', 'NEQUI', 'DAVIPLATA'].includes(wompiPaymentMethodType)) {
    return 'transferencia';
  }
  if (['CARD'].includes(wompiPaymentMethodType)) return 'tarjeta';
  return 'otro';
}

/**
 * Los webhooks de Wompi son solo una notificación ("algo pasó con el pago
 * X") — hay que consultar la API para saber el estado real. Es idempotente:
 * un webhook puede reintentarse, así que solo crea el `Payment` si el
 * intento todavía no fue marcado `approved`.
 *
 * Cuando el cargo pagado es de concepto `documento` y queda saldado, dispara
 * `CompleteDocumentPaymentUseCase` — mismo patrón que el resto de la app
 * usa para efectos secundarios sobre un cambio de estado (ver
 * SetScheduleVirtualUseCase → PublishAnnouncementUseCase).
 */
@Injectable()
export class HandlePaymentWebhookUseCase {
  private readonly logger = new Logger(HandlePaymentWebhookUseCase.name);

  constructor(
    @Inject(PaymentAttemptRepositoryPort) private readonly attempts: PaymentAttemptRepositoryPort,
    @Inject(RecordApprovedPaymentPort) private readonly recordApprovedPayment: RecordApprovedPaymentPort,
    @Inject(PaymentGatewayPort) private readonly gateway: PaymentGatewayPort,
    @Inject(ChargeRepositoryPort) private readonly charges: ChargeRepositoryPort,
    @Inject(PaymentRepositoryPort) private readonly payments: PaymentRepositoryPort,
    @Inject(forwardRef(() => CompleteDocumentPaymentUseCase))
    private readonly completeDocumentPayment: CompleteDocumentPaymentUseCase,
  ) {}

  async execute(input: PaymentWebhookInput): Promise<void> {
    const transactionId = input.data?.transaction?.id;
    if (input.event !== 'transaction.updated' || !transactionId) return;

    const info = await this.gateway.getPaymentInfo(transactionId);
    if (!info.externalReference) return;

    const attempt = await this.attempts.findById(info.externalReference);
    if (!attempt) {
      this.logger.warn(`Webhook para un intento de pago desconocido: ${info.externalReference}`);
      return;
    }

    if (attempt.status === 'approved') return; // ya procesado, evita duplicar el Payment

    if (info.status === 'approved') {
      const payment = new Payment(
        randomUUID(),
        attempt.chargeId,
        attempt.amount,
        mapPaymentMethod(info.paymentMethodId),
        new Date().toISOString().slice(0, 10),
        `wompi:${transactionId}`,
      );
      attempt.approve();
      await this.recordApprovedPayment.execute(payment, attempt);
      try {
        await this.checkDocumentChargeCompleted(attempt.chargeId);
      } catch (err) {
        this.logger.error(
          `Pago ${attempt.chargeId} registrado, pero falló la emisión del documento: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    } else if (info.status === 'rejected') {
      attempt.reject();
      await this.attempts.save(attempt);
    }
  }

  private async checkDocumentChargeCompleted(chargeId: string): Promise<void> {
    const charge = await this.charges.findById(chargeId);
    if (!charge || charge.concept !== 'documento') return;

    const payments = await this.payments.findAll({ chargeId });
    const paidAmount = payments.filter((p) => !p.voidedAt).reduce((sum, p) => sum + p.amount, 0);
    const balance = charge.computeBalance(paidAmount);
    if (balance <= 0) {
      await this.completeDocumentPayment.execute(chargeId);
    }
  }
}
