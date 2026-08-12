export interface CheckoutItem {
  title: string;
  amount: number;
}

export interface CreateCheckoutInput {
  externalReference: string;
  payerEmail: string;
  item: CheckoutItem;
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
