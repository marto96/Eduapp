export class AcademicYear {
  constructor(
    public readonly id: string,
    public name: string,
    public startDate: string,
    public endDate: string,
    public status: 'active' | 'closed',
  ) {
    if (startDate >= endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
  }

  edit(name: string, startDate: string, endDate: string): void {
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
