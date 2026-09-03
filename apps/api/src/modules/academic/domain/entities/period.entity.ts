export class Period {
  constructor(
    public readonly id: string,
    public readonly academicYearId: string,
    public name: string,
    public order: number,
    public weight: number,
    public startDate: string,
    public endDate: string,
  ) {
    if (startDate >= endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    if (weight <= 0 || weight > 1) {
      throw new Error('El peso del periodo debe estar entre 0 y 1');
    }
  }

  edit(name: string, order: number, weight: number, startDate: string, endDate: string): void {
    if (startDate >= endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    if (weight <= 0 || weight > 1) {
      throw new Error('El peso del periodo debe estar entre 0 y 1');
    }
    this.name = name;
    this.order = order;
    this.weight = weight;
    this.startDate = startDate;
    this.endDate = endDate;
  }
}
