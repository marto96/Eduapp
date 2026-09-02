export interface CheckoutItem {
  title: string;
  amount: number;
}

export interface CreateCheckoutInput {
  externalReference: string;
  payerEmail: string;
  item: CheckoutItem;
  /** Path (sin barra inicial) del webhook que MercadoPago debe notificar — ej. 'finance/payments/webhook'. Cada caller es dueño de su propio webhook, este gateway no debe asumir cuál. */
  webhookPath: string;
  /** Path (sin barra inicial, puede incluir querystring) al que redirigir tras un pago exitoso o pendiente. */
  successPath: string;
  /** Path (sin barra inicial) al que redirigir tras un pago fallido. */
  failurePath: string;
}

export interface CheckoutPreference {
  preferenceId: string;
  checkoutUrl: string;
}

export type GatewayPaymentStatus = 'approved' | 'pending' | 'rejected';

export interface GatewayPaymentInfo {
  status: GatewayPaymentStatus;
  paymentMethodId: string;
  externalReference: string | null;
}

/**
 * Abstrae el gateway de pago (hoy MercadoPago Checkout Pro — cubre
 * efectivo y digital en un solo checkout hosteado). `createCheckoutPreference`
 * arma la sesión de pago; `getPaymentInfo` la usa el webhook para confirmar
 * el estado real de un pago (los webhooks son solo una notificación, no
 * traen el estado en sí — hay que consultarlo).
 */
export abstract class PaymentGatewayPort {
  abstract createCheckoutPreference(input: CreateCheckoutInput): Promise<CheckoutPreference>;
  abstract getPaymentInfo(gatewayPaymentId: string): Promise<GatewayPaymentInfo>;
}
