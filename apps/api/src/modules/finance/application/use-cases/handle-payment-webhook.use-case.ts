import { randomUUID } from 'node:crypto';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { PaymentAttemptRepositoryPort } from '../ports/payment-attempt.repository.port';
import { RecordApprovedPaymentPort } from '../ports/record-approved-payment.port';
import { PaymentGatewayPort } from '../ports/payment-gateway.port';
import { Payment, PaymentMethod } from '../../domain/entities/payment.entity';

export interface PaymentWebhookInput {
  type?: string;
  data?: { id?: string };
}

function mapPaymentMethod(gatewayPaymentMethodId: string): PaymentMethod {
  if (['rapipago', 'pagofacil', 'redlink'].includes(gatewayPaymentMethodId)) return 'efectivo';
  if (['account_money', 'pse', 'debin_transfer'].includes(gatewayPaymentMethodId)) return 'transferencia';
  if (['visa', 'master', 'amex', 'debvisa', 'debmaster'].includes(gatewayPaymentMethodId)) return 'tarjeta';
  return 'otro';
}

/**
 * Los webhooks de MercadoPago son solo una notificación ("algo pasó con
 * el pago X") — hay que consultar la API para saber el estado real. Es
 * idempotente: un webhook puede reintentarse, así que solo crea el
 * `Payment` si el intento todavía no fue marcado `approved`.
 */
@Injectable()
export class HandlePaymentWebhookUseCase {
  private readonly logger = new Logger(HandlePaymentWebhookUseCase.name);

  constructor(
    @Inject(PaymentAttemptRepositoryPort) private readonly attempts: PaymentAttemptRepositoryPort,
    @Inject(RecordApprovedPaymentPort) private readonly recordApprovedPayment: RecordApprovedPaymentPort,
    @Inject(PaymentGatewayPort) private readonly gateway: PaymentGatewayPort,
  ) {}

  async execute(input: PaymentWebhookInput): Promise<void> {
    if (input.type !== 'payment' || !input.data?.id) return;

    const info = await this.gateway.getPaymentInfo(input.data.id);
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
        `mercadopago:${input.data.id}`,
      );
      attempt.approve();
      await this.recordApprovedPayment.execute(payment, attempt);
    } else if (info.status === 'rejected') {
      attempt.reject();
      await this.attempts.save(attempt);
    }
  }
}
