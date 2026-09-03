export type GradeCategory = 'actividad' | 'evaluacion_bimestral' | 'disciplina';

const WEIGHT_TOLERANCE = 0.001;

export class GradeWeightConfig {
  constructor(
    public readonly id: string,
    public actividadWeight: number,
    public evaluacionBimestralWeight: number,
    public disciplinaWeight: number,
  ) {
    GradeWeightConfig.assertSumsToOne(actividadWeight, evaluacionBimestralWeight, disciplinaWeight);
  }

  edit(actividadWeight: number, evaluacionBimestralWeight: number, disciplinaWeight: number): void {
    GradeWeightConfig.assertSumsToOne(actividadWeight, evaluacionBimestralWeight, disciplinaWeight);
    this.actividadWeight = actividadWeight;
    this.evaluacionBimestralWeight = evaluacionBimestralWeight;
    this.disciplinaWeight = disciplinaWeight;
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
}
