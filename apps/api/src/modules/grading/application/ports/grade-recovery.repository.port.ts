import { GradeRecovery } from '../../domain/entities/grade-recovery.entity';

export interface GradeRecoveryFilter {
  enrollmentId?: string;
}

export abstract class GradeRecoveryRepositoryPort {
  abstract findByKey(enrollmentId: string, subjectId: string, periodId: string): Promise<GradeRecovery | null>;
  abstract findAll(filter?: GradeRecoveryFilter): Promise<GradeRecovery[]>;
  /** Upsert por (enrollmentId, subjectId, periodId): si ya existe, actualiza el score. */
  abstract upsert(recovery: GradeRecovery): Promise<void>;
}
