import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment as MercadoPagoPayment } from 'mercadopago';
import {
  CheckoutPreference,
  CreateCheckoutInput,
  GatewayPaymentInfo,
  GatewayPaymentStatus,
  PaymentGatewayPort,
} from '../../application/ports/payment-gateway.port';
import { getCurrentTenant } from '../../../../core/tenant/tenant-context';

const STATUS_MAP: Record<string, GatewayPaymentStatus> = {
  approved: 'approved',
  pending: 'pending',
  in_process: 'pending',
  rejected: 'rejected',
  cancelled: 'rejected',
};

@Injectable()
export class MercadoPagoPaymentGateway extends PaymentGatewayPort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async createCheckoutPreference(input: CreateCheckoutInput): Promise<CheckoutPreference> {
    const client = new MercadoPagoConfig({
      accessToken: this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN')!,
    });
    const preference = new Preference(client);

    const apiPublicUrl = this.config.get<string>('API_PUBLIC_URL') ?? 'http://localhost:3001';
    const webUrl = this.config.get<string>('WEB_PUBLIC_URL') ?? 'http://localhost:3000';
    // MercadoPago llama al webhook directo, sin el Host de ningún tenant ni
    // el header x-tenant-subdomain de desarrollo — viaja como query param,
    // ver PaymentWebhookTenantMiddleware.
    const { subdomain } = getCurrentTenant();

    const result = await preference.create({
      body: {
        items: [
          {
            id: input.externalReference,
            title: input.item.title,
            quantity: 1,
            unit_price: input.item.amount,
          },
        ],
        payer: { email: input.payerEmail },
        external_reference: input.externalReference,
        notification_url: `${apiPublicUrl}/finance/payments/webhook?tenant=${subdomain}`,
        back_urls: {
          success: `${webUrl}/portal/payment-success`,
          failure: `${webUrl}/portal/payment-failure`,
          pending: `${webUrl}/portal/payment-success`,
        },
      },
    });

    return { preferenceId: result.id!, checkoutUrl: result.init_point! };
  }

  async getPaymentInfo(gatewayPaymentId: string): Promise<GatewayPaymentInfo> {
    const client = new MercadoPagoConfig({
      accessToken: this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN')!,
    });
    const payment = new MercadoPagoPayment(client);
    const result = await payment.get({ id: gatewayPaymentId });

    return {
      status: STATUS_MAP[result.status ?? ''] ?? 'pending',
      paymentMethodId: result.payment_method_id ?? 'otro',
      externalReference: result.external_reference ?? null,
    };
  }
}
