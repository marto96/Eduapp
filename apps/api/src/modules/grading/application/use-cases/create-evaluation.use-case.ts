import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { Evaluation, EvaluationType } from '../../domain/entities/evaluation.entity';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface CreateEvaluationInput {
  subjectId: string;
  sectionId: string;
  academicYearId: string;
  period: string;
  type: EvaluationType;
  maxScore?: number;
}

@Injectable()
export class CreateEvaluationUseCase {
  constructor(
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(input: CreateEvaluationInput, currentUser: JwtPayload): Promise<Evaluation> {
    const canAccess = await this.enrollmentAccess.canTeacherAccessSection(currentUser, input.sectionId);
    if (!canAccess) {
      throw new ForbiddenException('No tenés un horario asignado en esa sección');
    }

    const evaluation = new Evaluation(
      randomUUID(),
      input.subjectId,
      input.sectionId,
      input.academicYearId,
      input.period,
      input.type,
      input.maxScore ?? 10,
    );

    await this.evaluations.save(evaluation);
    return evaluation;
  }
}
