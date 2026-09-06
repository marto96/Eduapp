import { Inject, Injectable } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { GradeWeightConfigService } from './grade-weight-config.service';
import {
  EvaluationItem,
  GradeCalculationService,
  PeriodGradeInput,
} from '../../domain/services/grade-calculation.service';

@Injectable()
export class StudentYearAverageService {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    @Inject(GradeScoreRepositoryPort) private readonly scores: GradeScoreRepositoryPort,
    @Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort,
    private readonly weightConfigService: GradeWeightConfigService,
  ) {}

  /**
   * Promedio general de una matrícula, agregando todas sus materias. Una
   * materia sin ninguna nota cargada no cuenta como 0 — se excluye del
   * promedio (a diferencia de `computeAccumulatedGrade`, que sí trata un
   * periodo sin nota como 0 para el boletín en vivo; acá el promedio es
   * comparativo entre estudiantes, no una alerta de "falta nota").
   */
  async compute(enrollmentId: string): Promise<number | null> {
    const enrollment = await this.enrollments.findById(enrollmentId);
    if (!enrollment) return null;

    const [gradeScores, sectionEvaluations, periods, weightConfig] = await Promise.all([
      this.scores.findAll({ enrollmentId }),
      this.evaluations.findAll({ sectionId: enrollment.sectionId, academicYearId: enrollment.academicYearId }),
      this.periods.findAll({ academicYearId: enrollment.academicYearId }),
      this.weightConfigService.getOrCreateDefault(),
    ]);

    if (gradeScores.length === 0) return null;

    const scoreByEvaluationId = new Map(gradeScores.map((s) => [s.evaluationId, s.score]));
    const periodWeightById = new Map(periods.map((p) => [p.id, p.weight]));

    const bySubject = new Map<string, Map<string, EvaluationItem[]>>();
    for (const evaluation of sectionEvaluations) {
      if (!bySubject.has(evaluation.subjectId)) bySubject.set(evaluation.subjectId, new Map());
      const byPeriod = bySubject.get(evaluation.subjectId)!;
      if (!byPeriod.has(evaluation.periodId)) byPeriod.set(evaluation.periodId, []);
      byPeriod.get(evaluation.periodId)!.push({
        evaluationId: evaluation.id,
        category: evaluation.category,
        label: evaluation.label,
        maxScore: evaluation.maxScore,
        rawScore: scoreByEvaluationId.get(evaluation.id) ?? null,
      });
    }

    const subjectAverages: number[] = [];
    for (const byPeriod of bySubject.values()) {
      const periodGrades: PeriodGradeInput[] = [];
      for (const [periodId, items] of byPeriod) {
        const { grade } = GradeCalculationService.computeSubjectPeriodGrade(items, weightConfig);
        if (grade !== null) {
          periodGrades.push({ weight: periodWeightById.get(periodId) ?? 0, grade });
        }
      }
      if (periodGrades.length === 0) continue;
      subjectAverages.push(GradeCalculationService.computeAccumulatedGrade(periodGrades));
    }

    if (subjectAverages.length === 0) return null;
    return subjectAverages.reduce((sum, g) => sum + g, 0) / subjectAverages.length;
  }
}
