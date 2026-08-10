export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';

export class Payment {
  constructor(
    public readonly id: string,
    public readonly chargeId: string,
    public readonly amount: number,
    public readonly method: PaymentMethod,
    public readonly paidAt: string,
    public readonly reference?: string,
  ) {
    if (amount <= 0) {
      throw new Error('El monto del pago debe ser mayor a cero');
    }
  }
}
