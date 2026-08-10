export type EvaluationType = 'examen' | 'tarea' | 'proyecto' | 'otro';

export class Evaluation {
  constructor(
    public readonly id: string,
    public readonly subjectId: string,
    public readonly sectionId: string,
    public readonly academicYearId: string,
    public period: string,
    public type: EvaluationType,
    public maxScore: number,
  ) {}
}
