import { GradeCategory, GradeWeightConfig } from '../entities/grade-weight-config.entity';

const CATEGORIES: GradeCategory[] = ['actividad', 'evaluacion_bimestral', 'disciplina'];

export interface EvaluationItem {
  evaluationId: string;
  category: GradeCategory;
  label: string | null;
  maxScore: number;
  /** `null` = la evaluación existe pero todavía no se cargó la nota de este estudiante. */
  rawScore: number | null;
}

export interface CategoryBreakdown {
  category: GradeCategory;
  weight: number;
  average: number | null;
  items: (EvaluationItem & { normalized: number | null })[];
}

export interface SubjectPeriodGrade {
  /** `null` = "-", ninguna categoría tiene todavía una nota cargada. */
  grade: number | null;
  /** `true` si no las 3 categorías tienen datos aún (nota "en vivo", no cerrada). */
  isPartial: boolean;
  categories: CategoryBreakdown[];
}

export interface PeriodGradeInput {
  weight: number;
  grade: number | null;
}

export class GradeCalculationService {
  static normalize(rawScore: number, maxScore: number): number {
    return (rawScore / maxScore) * 5;
  }

  static computeSubjectPeriodGrade(
    evaluationItems: EvaluationItem[],
    weights: GradeWeightConfig,
  ): SubjectPeriodGrade {
    const categories: CategoryBreakdown[] = CATEGORIES.map((category) => {
      const items = evaluationItems
        .filter((item) => item.category === category)
        .map((item) => ({
          ...item,
          normalized: item.rawScore === null ? null : GradeCalculationService.normalize(item.rawScore, item.maxScore),
        }));

      const scored = items.map((item) => item.normalized).filter((n): n is number => n !== null);
      const average = scored.length === 0 ? null : scored.reduce((sum, n) => sum + n, 0) / scored.length;

      return { category, weight: weights.weightFor(category), average, items };
    });

    const withData = categories.filter((c) => c.average !== null);
    if (withData.length === 0) {
      return { grade: null, isPartial: false, categories };
    }

    const totalWeight = withData.reduce((sum, c) => sum + c.weight, 0);
    const grade = withData.reduce((sum, c) => sum + c.average! * c.weight, 0) / totalWeight;

    return { grade, isPartial: withData.length < CATEGORIES.length, categories };
  }

  static computeAccumulatedGrade(periodGrades: PeriodGradeInput[]): number {
    return periodGrades.reduce((sum, p) => sum + p.weight * (p.grade ?? 0), 0);
  }

  static computeAccumulatedAbsences(periodAbsences: number[]): number {
    return periodAbsences.reduce((sum, n) => sum + n, 0);
  }

  /** Devuelve subjectId -> (periodId -> cantidad de ausencias). */
  static countAbsencesBySubjectAndPeriod(
    absenceRecords: { scheduleId: string | null; date: string }[],
    scheduleSubjectMap: Map<string, string>,
    periods: { id: string; startDate: string; endDate: string }[],
  ): Map<string, Map<string, number>> {
    const result = new Map<string, Map<string, number>>();

    for (const record of absenceRecords) {
      if (!record.scheduleId) continue;
      const subjectId = scheduleSubjectMap.get(record.scheduleId);
      if (!subjectId) continue;
      const period = periods.find((p) => record.date >= p.startDate && record.date <= p.endDate);
      if (!period) continue;

      if (!result.has(subjectId)) result.set(subjectId, new Map());
      const bySubject = result.get(subjectId)!;
      bySubject.set(period.id, (bySubject.get(period.id) ?? 0) + 1);
    }

    return result;
  }
}
