import { Payment } from '../../domain/entities/payment.entity';
import { PaymentAttempt } from '../../domain/entities/payment-attempt.entity';

/**
 * Guarda el `Payment` aprobado y el `PaymentAttempt` actualizado como una
 * sola operación atómica — si el proceso falla entre medio, ninguno de los
 * dos queda persistido, evitando que un reintento del webhook (MercadoPago
 * reintenta notificaciones) encuentre el intento todavía no `approved` y
 * cree un `Payment` duplicado para el mismo cargo.
 */
export abstract class RecordApprovedPaymentPort {
  abstract execute(payment: Payment, attempt: PaymentAttempt): Promise<void>;
}
