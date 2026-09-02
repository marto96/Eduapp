import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CheckoutPreference,
  CreateCheckoutInput,
  GatewayPaymentInfo,
  GatewayPaymentStatus,
  PaymentGatewayPort,
} from '../../application/ports/payment-gateway.port';
import { getCurrentTenant } from '../../../../core/tenant/tenant-context';
import { buildWompiReference, parseWompiReference } from './wompi-reference';

const STATUS_MAP: Record<string, GatewayPaymentStatus> = {
  APPROVED: 'approved',
  PENDING: 'pending',
  DECLINED: 'rejected',
  VOIDED: 'rejected',
  ERROR: 'rejected',
};

interface WompiTransactionResponse {
  data: {
    status: string;
    payment_method_type: string;
    reference: string;
  };
}

/**
 * Base de la API de Wompi según el ambiente — se deriva del prefijo de la
 * llave pública (`pub_test_` vs `pub_prod_`) en vez de una env var aparte,
 * así no hay forma de mezclar una llave de sandbox con el host de
 * producción por error de configuración.
 */
function apiHostFor(publicKey: string): string {
  return publicKey.startsWith('pub_test_') ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1';
}

@Injectable()
export class WompiPaymentGateway extends PaymentGatewayPort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async createCheckoutPreference(input: CreateCheckoutInput): Promise<CheckoutPreference> {
    const publicKey = this.config.get<string>('WOMPI_PUBLIC_KEY')!;
    const integritySecret = this.config.get<string>('WOMPI_INTEGRITY_SECRET')!;
    const webUrl = this.config.get<string>('WEB_PUBLIC_URL') ?? 'http://localhost:3000';

    // A diferencia de MercadoPago, Wompi no acepta una URL de notificación
    // por transacción — el tenant viaja en la referencia, no en el webhook
    // URL (ver WompiWebhookTenantMiddleware, que la desarma del lado del
    // webhook).
    const { subdomain } = getCurrentTenant();
    const reference = buildWompiReference(subdomain, input.externalReference);
    const currency = 'COP';
    const amountInCents = Math.round(input.item.amount * 100);

    const integrity = createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${integritySecret}`)
      .digest('hex');

    const params = new URLSearchParams({
      'public-key': publicKey,
      currency,
      'amount-in-cents': String(amountInCents),
      reference,
      'signature:integrity': integrity,
      'redirect-url': `${webUrl}/${input.successPath}`,
    });

    return {
      preferenceId: reference,
      checkoutUrl: `https://checkout.wompi.co/p/?${params.toString()}`,
    };
  }

  async getPaymentInfo(gatewayPaymentId: string): Promise<GatewayPaymentInfo> {
    const publicKey = this.config.get<string>('WOMPI_PUBLIC_KEY')!;

    const response = await fetch(`${apiHostFor(publicKey)}/transactions/${gatewayPaymentId}`, {
      headers: { Authorization: `Bearer ${publicKey}` },
    });
    if (!response.ok) {
      throw new Error(
        `Wompi respondió ${response.status} al consultar la transacción ${gatewayPaymentId}`,
      );
    }

    const { data } = (await response.json()) as WompiTransactionResponse;
    const parsed = parseWompiReference(data.reference);

    return {
      status: STATUS_MAP[data.status] ?? 'pending',
      paymentMethodId: data.payment_method_type ?? 'otro',
      externalReference: parsed?.externalReference ?? null,
    };
  }
}
