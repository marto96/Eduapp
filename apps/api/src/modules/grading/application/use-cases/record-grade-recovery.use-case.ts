import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeRecoveryRepositoryPort } from '../ports/grade-recovery.repository.port';
import { GradeRecovery } from '../../domain/entities/grade-recovery.entity';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeCalculationService, EvaluationItem } from '../../domain/services/grade-calculation.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface RecordGradeRecoveryInput {
  enrollmentId: string;
  subjectId: string;
  periodId: string;
  score: number;
}

@Injectable()
export class RecordGradeRecoveryUseCase {
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

  async execute(input: RecordGradeRecoveryInput, currentUser: JwtPayload): Promise<GradeRecovery> {
    const enrollment = await this.enrollments.findById(input.enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${input.enrollmentId}"`);
    }

    const canAccess = await this.enrollmentAccess.canTeacherAccessSection(currentUser, enrollment.sectionId);
    if (!canAccess) {
      throw new ForbiddenException('No tenés un horario asignado en esa sección');
    }

    const period = await this.periods.findById(input.periodId);
    if (!period || period.academicYearId !== enrollment.academicYearId) {
      throw new NotFoundException(`No existe el periodo "${input.periodId}" para ese año lectivo`);
    }

    const allSubjects = await this.subjects.findAll();
    const subject = allSubjects.find((s) => s.id === input.subjectId);
    if (!subject) {
      throw new NotFoundException(`No existe la materia "${input.subjectId}"`);
    }

    if (input.score < 0 || input.score > 5) {
      throw new BadRequestException(`La nota de recuperación ${input.score} está fuera de rango (0-5)`);
    }

    const [subjectEvaluations, scoresForEnrollment, weights] = await Promise.all([
      this.evaluations.findAll({
        sectionId: enrollment.sectionId,
        academicYearId: enrollment.academicYearId,
        subjectId: input.subjectId,
        periodId: input.periodId,
      }),
      this.scores.findAll({ enrollmentId: input.enrollmentId }),
      this.weightConfigService.getOrCreateDefault(),
    ]);

    const scoreByEvaluationId = new Map(scoresForEnrollment.map((s) => [s.evaluationId, s.score]));
    const items: EvaluationItem[] = subjectEvaluations.map((e) => ({
      evaluationId: e.id,
      category: e.category,
      label: e.label,
      maxScore: e.maxScore,
      rawScore: scoreByEvaluationId.get(e.id) ?? null,
    }));
    const { grade } = GradeCalculationService.computeSubjectPeriodGrade(items, weights);

    if (grade !== null && grade >= weights.minPassingGrade) {
      throw new ConflictException('Esta materia ya está aprobada en ese periodo — no hace falta recuperarla');
    }

    const recovery = new GradeRecovery(randomUUID(), input.enrollmentId, input.subjectId, input.periodId, input.score);
    await this.recoveries.upsert(recovery);

    return (await this.recoveries.findByKey(input.enrollmentId, input.subjectId, input.periodId))!;
  }
}
