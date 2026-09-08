export type GradeCategory = 'actividad' | 'evaluacion_bimestral' | 'disciplina';

const WEIGHT_TOLERANCE = 0.001;

export class GradeWeightConfig {
  constructor(
    public readonly id: string,
    public actividadWeight: number,
    public evaluacionBimestralWeight: number,
    public disciplinaWeight: number,
    public minPassingGrade: number = 3.0,
  ) {
    GradeWeightConfig.assertSumsToOne(actividadWeight, evaluacionBimestralWeight, disciplinaWeight);
    GradeWeightConfig.assertValidMinPassingGrade(minPassingGrade);
  }

  edit(
    actividadWeight: number,
    evaluacionBimestralWeight: number,
    disciplinaWeight: number,
    minPassingGrade: number,
  ): void {
    GradeWeightConfig.assertSumsToOne(actividadWeight, evaluacionBimestralWeight, disciplinaWeight);
    GradeWeightConfig.assertValidMinPassingGrade(minPassingGrade);
    this.actividadWeight = actividadWeight;
    this.evaluacionBimestralWeight = evaluacionBimestralWeight;
    this.disciplinaWeight = disciplinaWeight;
    this.minPassingGrade = minPassingGrade;
  }

  weightFor(category: GradeCategory): number {
    if (category === 'actividad') return this.actividadWeight;
    if (category === 'evaluacion_bimestral') return this.evaluacionBimestralWeight;
    return this.disciplinaWeight;
  }

  private static assertSumsToOne(a: number, b: number, c: number): void {
    if (Math.abs(a + b + c - 1) > WEIGHT_TOLERANCE) {
      throw new Error('Los tres pesos deben sumar 100%');
    }
  }

  private static assertValidMinPassingGrade(minPassingGrade: number): void {
    if (minPassingGrade <= 0 || minPassingGrade > 5) {
      throw new Error('La nota mínima aprobatoria debe estar entre 0 y 5');
    }
  }
}
