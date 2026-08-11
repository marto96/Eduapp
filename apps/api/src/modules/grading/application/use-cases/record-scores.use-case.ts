import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface RecordScoresEntry {
  enrollmentId: string;
  score: number;
}

export interface RecordScoresInput {
  evaluationId: string;
  scores: RecordScoresEntry[];
}

@Injectable()
export class RecordScoresUseCase {
  constructor(
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    @Inject(GradeScoreRepositoryPort) private readonly gradeScores: GradeScoreRepositoryPort,
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(input: RecordScoresInput, currentUser: JwtPayload): Promise<GradeScore[]> {
    const evaluation = await this.evaluations.findById(input.evaluationId);
    if (!evaluation) {
      throw new NotFoundException(`No existe la evaluación "${input.evaluationId}"`);
    }

    const canAccess = await this.enrollmentAccess.canTeacherAccessSection(
      currentUser,
      evaluation.sectionId,
    );
    if (!canAccess) {
      throw new ForbiddenException('No tenés un horario asignado en esa sección');
    }

    const outOfRange = input.scores.find((s) => s.score < 0 || s.score > evaluation.maxScore);
    if (outOfRange) {
      throw new BadRequestException(
        `La nota ${outOfRange.score} está fuera de rango (0-${evaluation.maxScore})`,
      );
    }

    const sectionEnrollments = await this.enrollments.findAll({
      sectionId: evaluation.sectionId,
      academicYearId: evaluation.academicYearId,
    });
    const validEnrollmentIds = new Set(sectionEnrollments.map((e) => e.id));

    const invalid = input.scores.find((s) => !validEnrollmentIds.has(s.enrollmentId));
    if (invalid) {
      throw new BadRequestException(
        `La matrícula "${invalid.enrollmentId}" no pertenece a la sección/año de esta evaluación`,
      );
    }

    const records = input.scores.map(
      (entry) => new GradeScore(randomUUID(), input.evaluationId, entry.enrollmentId, entry.score),
    );

    await this.gradeScores.upsertMany(records);
    return records;
  }
}
