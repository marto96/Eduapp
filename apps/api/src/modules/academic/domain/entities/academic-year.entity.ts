export class AcademicYear {
  constructor(
    public readonly id: string,
    public name: string,
    public startDate: Date,
    public endDate: Date,
    public status: 'active' | 'closed',
  ) {
    if (startDate >= endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
  }

  edit(name: string, startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    this.name = name;
    this.startDate = startDate;
    this.endDate = endDate;
  }

  close(): void {
    this.status = 'closed';
  }
}
