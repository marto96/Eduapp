import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface CreateGradeInput {
  subjectId: string;
  sectionId: string;
  periodId: string;
  category: GradeCategory;
  evaluationId?: string;
  label?: string;
  maxScore?: number;
  score: number;
}

@Injectable()
export class CreateGradeUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    @Inject(GradeScoreRepositoryPort) private readonly scores: GradeScoreRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(enrollmentId: string, input: CreateGradeInput, currentUser: JwtPayload): Promise<GradeScore> {
    const enrollment = await this.enrollments.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${enrollmentId}"`);
    }

    const canAccess = await this.enrollmentAccess.canTeacherAccessSection(currentUser, input.sectionId);
    if (!canAccess) {
      throw new ForbiddenException('No tenés un horario asignado en esa sección');
    }

    if (input.sectionId !== enrollment.sectionId) {
      throw new BadRequestException('La sección no corresponde a la sección real de esa matrícula');
    }

    let evaluation: Evaluation;
    if (input.evaluationId) {
      const existing = await this.evaluations.findById(input.evaluationId);
      if (!existing) {
        throw new NotFoundException(`No existe la evaluación "${input.evaluationId}"`);
      }
      if (
        existing.subjectId !== input.subjectId ||
        existing.sectionId !== input.sectionId ||
        existing.periodId !== input.periodId ||
        existing.category !== input.category
      ) {
        throw new BadRequestException('Esa evaluación no corresponde a esta materia/periodo/categoría');
      }
      evaluation = existing;
    } else {
      evaluation = new Evaluation(
        randomUUID(),
        input.subjectId,
        input.sectionId,
        enrollment.academicYearId,
        input.periodId,
        input.category,
        input.maxScore ?? 10,
        input.label ?? null,
      );
      await this.evaluations.save(evaluation);
    }

    if (input.score < 0 || input.score > evaluation.maxScore) {
      throw new BadRequestException(`La nota ${input.score} está fuera de rango (0-${evaluation.maxScore})`);
    }

    const gradeScore = new GradeScore(randomUUID(), evaluation.id, enrollmentId, input.score);
    await this.scores.upsertMany([gradeScore]);
    return gradeScore;
  }
}
