export class GradeScore {
  constructor(
    public readonly id: string,
    public readonly evaluationId: string,
    public readonly enrollmentId: string,
    public score: number,
  ) {}
}
