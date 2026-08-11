import { Inject, Injectable } from '@nestjs/common';
import { GradeScoreFilter, GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class ListScoresUseCase {
  constructor(
    @Inject(GradeScoreRepositoryPort) private readonly gradeScores: GradeScoreRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(filter: GradeScoreFilter | undefined, currentUser: JwtPayload): Promise<GradeScore[]> {
    const scores = await this.gradeScores.findAll(filter);
    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    if (allowedEnrollmentIds === null) return scores;
    return scores.filter((score) => allowedEnrollmentIds.has(score.enrollmentId));
  }
}
