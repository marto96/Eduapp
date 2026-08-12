export class BankTransaction {
  constructor(
    public readonly id: string,
    public readonly date: string,
    public readonly amount: number,
    public readonly description: string,
    public readonly importedAt: string,
    public matchedPaymentId: string | null = null,
  ) {
    if (amount === 0) {
      throw new Error('El monto de la transacción no puede ser cero');
    }
  }

  match(paymentId: string): void {
    if (this.matchedPaymentId) {
      throw new Error('Esta transacción ya está conciliada');
    }
    this.matchedPaymentId = paymentId;
  }
}
