export type EnrollmentStatus = 'active' | 'withdrawn' | 'completed';

export class Enrollment {
  constructor(
    public readonly id: string,
    public readonly studentId: string,
    public sectionId: string,
    public readonly academicYearId: string,
    public status: EnrollmentStatus,
    /** `null` = todavía no se completó, o se completó antes de que este campo existiera. */
    public passed: boolean | null = null,
  ) {}

  withdraw(): void {
    this.status = 'withdrawn';
  }

  complete(passed: boolean): void {
    this.status = 'completed';
    this.passed = passed;
  }

  reassignSection(sectionId: string): void {
    this.sectionId = sectionId;
  }
}
