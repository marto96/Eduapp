export class GradeRecovery {
  constructor(
    public readonly id: string,
    public readonly enrollmentId: string,
    public readonly subjectId: string,
    public readonly periodId: string,
    public score: number,
  ) {}
}
