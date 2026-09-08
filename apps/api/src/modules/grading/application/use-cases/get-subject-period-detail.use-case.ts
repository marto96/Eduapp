import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeRecoveryRepositoryPort } from '../ports/grade-recovery.repository.port';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import {
  CategoryBreakdown,
  EvaluationItem,
  GradeCalculationService,
} from '../../domain/services/grade-calculation.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface SubjectPeriodDetailResponse {
  subjectId: string;
  subjectName: string;
  periodId: string;
  periodName: string;
  grade: number | null;
  isPartial: boolean;
  isRecovered: boolean;
  minPassingGrade: number;
  categories: CategoryBreakdown[];
}

@Injectable()
export class GetSubjectPeriodDetailUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(SubjectRepositoryPort) private readonly subjects: SubjectRepositoryPort,
    @Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort,
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    @Inject(GradeScoreRepositoryPort) private readonly scores: GradeScoreRepositoryPort,
    @Inject(GradeRecoveryRepositoryPort) private readonly recoveries: GradeRecoveryRepositoryPort,
    private readonly weightConfigService: GradeWeightConfigService,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(
    enrollmentId: string,
    subjectId: string,
    periodId: string,
    currentUser: JwtPayload,
  ): Promise<SubjectPeriodDetailResponse> {
    const enrollment = await this.enrollments.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${enrollmentId}"`);
    }

    const allowed = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    if (allowed !== null && !allowed.has(enrollmentId)) {
      throw new ForbiddenException('No tenés acceso al boletín de este estudiante');
    }

    const period = await this.periods.findById(periodId);
    if (!period || period.academicYearId !== enrollment.academicYearId) {
      throw new NotFoundException(`No existe el periodo "${periodId}" para ese año lectivo`);
    }

    const [allSubjects, subjectEvaluations, scoresForEnrollment, recovery, weights] = await Promise.all([
      this.subjects.findAll(),
      this.evaluations.findAll({
        sectionId: enrollment.sectionId,
        academicYearId: enrollment.academicYearId,
        subjectId,
        periodId,
      }),
      this.scores.findAll({ enrollmentId }),
      this.recoveries.findByKey(enrollmentId, subjectId, periodId),
      this.weightConfigService.getOrCreateDefault(),
    ]);

    const subject = allSubjects.find((s) => s.id === subjectId);
    if (!subject) {
      throw new NotFoundException(`No existe la materia "${subjectId}"`);
    }

    const scoreByEvaluationId = new Map(scoresForEnrollment.map((s) => [s.evaluationId, s.score]));
    const items: EvaluationItem[] = subjectEvaluations.map((e) => ({
      evaluationId: e.id,
      category: e.category,
      label: e.label,
      maxScore: e.maxScore,
      rawScore: scoreByEvaluationId.get(e.id) ?? null,
    }));

    const computed = GradeCalculationService.computeSubjectPeriodGrade(items, weights);
    const grade = recovery ? recovery.score : computed.grade;
    const isPartial = recovery ? false : computed.isPartial;

    return {
      subjectId,
      subjectName: subject.name,
      periodId,
      periodName: period.name,
      grade,
      isPartial,
      isRecovered: recovery !== null,
      minPassingGrade: weights.minPassingGrade,
      categories: computed.categories,
    };
  }
}
