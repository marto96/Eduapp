import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';

export interface EvaluationFilter {
  sectionId?: string;
  academicYearId?: string;
  subjectId?: string;
  periodId?: string;
  category?: GradeCategory;
}

export abstract class EvaluationRepositoryPort {
  abstract findAll(filter?: EvaluationFilter): Promise<Evaluation[]>;
  abstract findById(id: string): Promise<Evaluation | null>;
  abstract save(evaluation: Evaluation): Promise<void>;
}
