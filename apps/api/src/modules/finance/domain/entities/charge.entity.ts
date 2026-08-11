export type ChargeConcept = 'matricula' | 'pension' | 'otro';

export class Charge {
  constructor(
    public readonly id: string,
    public readonly enrollmentId: string,
    public readonly concept: ChargeConcept,
    public readonly description: string,
    public readonly amount: number,
    public readonly dueDate: string,
    public readonly discountAmount: number = 0,
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
}
