import { ChargeConcept } from './charge.entity';

export class FeeSchedule {
  constructor(
    public readonly id: string,
    public readonly gradeId: string,
    public readonly academicYearId: string,
    public readonly concept: ChargeConcept,
    public amount: number,
  ) {
    if (amount <= 0) {
      throw new Error('El monto debe ser mayor a cero');
    }
  }

  updateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('El monto debe ser mayor a cero');
    }
    this.amount = amount;
  }
}
