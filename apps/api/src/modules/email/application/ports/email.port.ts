export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Abstrae el proveedor de correo transaccional (hoy Resend). Mismo criterio
 * que `PaymentGatewayPort` para el gateway de pago: el resto del sistema
 * nunca conoce el SDK concreto.
 */
export abstract class EmailPort {
  abstract send(input: SendEmailInput): Promise<void>;
}
