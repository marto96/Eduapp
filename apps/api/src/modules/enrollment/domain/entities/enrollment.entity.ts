export type EnrollmentStatus = 'active' | 'withdrawn' | 'completed';

export class Enrollment {
  constructor(
    public readonly id: string,
    public readonly studentId: string,
    public sectionId: string,
    public readonly academicYearId: string,
    public status: EnrollmentStatus,
  ) {}

  withdraw(): void {
    this.status = 'withdrawn';
  }

  complete(): void {
    this.status = 'completed';
  }

  reassignSection(sectionId: string): void {
    this.sectionId = sectionId;
  }
}
