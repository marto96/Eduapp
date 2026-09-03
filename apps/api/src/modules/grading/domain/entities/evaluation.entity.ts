import { GradeCategory } from './grade-weight-config.entity';

export class Evaluation {
  constructor(
    public readonly id: string,
    public readonly subjectId: string,
    public readonly sectionId: string,
    public readonly academicYearId: string,
    public readonly periodId: string,
    public readonly category: GradeCategory,
    public readonly maxScore: number,
    public readonly label: string | null,
  ) {}
}
