export type ChargeConcept = 'matricula' | 'pension' | 'otro';

export class Charge {
  constructor(
    public readonly id: string,
    public readonly enrollmentId: string,
    public readonly concept: ChargeConcept,
    public readonly description: string,
    public readonly amount: number,
    public readonly dueDate: string,
  ) {
    if (amount <= 0) {
      throw new Error('El monto del cargo debe ser mayor a cero');
    }
  }
}
