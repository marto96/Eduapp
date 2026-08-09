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

  close(): void {
    this.status = 'closed';
  }
}
