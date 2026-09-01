export type ChargeConcept = 'matricula' | 'pension' | 'otro';

export class Charge {
  constructor(
    public readonly id: string,
    public readonly enrollmentId: string,
    public readonly concept: ChargeConcept,
    public description: string,
    public amount: number,
    public dueDate: string,
    public discountAmount: number = 0,
    public editedAt: string | null = null,
    public voidedAt: string | null = null,
  ) {
    if (amount <= 0) {
      throw new Error('El monto del cargo debe ser mayor a cero');
    }
    if (discountAmount < 0) {
      throw new Error('El descuento no puede ser negativo');
    }
    if (discountAmount > amount) {
      throw new Error('El descuento no puede superar el monto del cargo');
    }
  }

  edit(amount: number, description: string, dueDate: string, discountAmount: number): void {
    if (amount <= 0) {
      throw new Error('El monto del cargo debe ser mayor a cero');
    }
    if (discountAmount < 0) {
      throw new Error('El descuento no puede ser negativo');
    }
    if (discountAmount > amount) {
      throw new Error('El descuento no puede superar el monto del cargo');
    }
    this.amount = amount;
    this.description = description;
    this.dueDate = dueDate;
    this.discountAmount = discountAmount;
    this.editedAt = new Date().toISOString();
  }

  markVoided(): void {
    this.voidedAt = new Date().toISOString();
  }

  computeBalance(paidAmount: number): number {
    return this.amount - this.discountAmount - paidAmount;
  }
}
