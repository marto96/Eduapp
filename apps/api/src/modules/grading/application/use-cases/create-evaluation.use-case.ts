import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface CreateEvaluationInput {
  subjectId: string;
  sectionId: string;
  academicYearId: string;
  periodId: string;
  category: GradeCategory;
  maxScore?: number;
  label?: string;
}

@Injectable()
export class CreateEvaluationUseCase {
  constructor(
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    @Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(input: CreateEvaluationInput, currentUser: JwtPayload): Promise<Evaluation> {
    const canAccess = await this.enrollmentAccess.canTeacherAccessSection(currentUser, input.sectionId);
    if (!canAccess) {
      throw new ForbiddenException('No tenés un horario asignado en esa sección');
    }

    const period = await this.periods.findById(input.periodId);
    if (!period || period.academicYearId !== input.academicYearId) {
      throw new NotFoundException(`No existe el periodo "${input.periodId}" para ese año lectivo`);
    }

    const evaluation = new Evaluation(
      randomUUID(),
      input.subjectId,
      input.sectionId,
      input.academicYearId,
      input.periodId,
      input.category,
      input.maxScore ?? 10,
      input.label ?? null,
    );

    await this.evaluations.save(evaluation);
    return evaluation;
  }
}
