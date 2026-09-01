export type DayOfWeek = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado';

export class Schedule {
  constructor(
    public readonly id: string,
    public readonly sectionId: string,
    public readonly subjectId: string,
    public readonly teacherId: string,
    public readonly academicYearId: string,
    public readonly dayOfWeek: DayOfWeek,
    public readonly startTime: string,
    public readonly endTime: string,
    public isVirtual: boolean = false,
  ) {
    if (startTime >= endTime) {
      throw new Error('La hora de inicio debe ser anterior a la hora de fin');
    }
  }

  overlaps(other: Schedule): boolean {
    return this.startTime < other.endTime && other.startTime < this.endTime;
  }

  setVirtual(isVirtual: boolean): void {
    this.isVirtual = isVirtual;
  }
}
