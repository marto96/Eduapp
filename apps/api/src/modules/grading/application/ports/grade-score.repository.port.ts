import { GradeScore } from '../../domain/entities/grade-score.entity';

export interface GradeScoreFilter {
  evaluationId?: string;
  enrollmentId?: string;
}

export abstract class GradeScoreRepositoryPort {
  abstract findAll(filter?: GradeScoreFilter): Promise<GradeScore[]>;
  /** Upsert por (evaluationId, enrollmentId): si ya existe, actualiza el score. */
  abstract upsertMany(scores: GradeScore[]): Promise<void>;
}
