import { Evaluation } from '../../domain/entities/evaluation.entity';

export interface EvaluationFilter {
  sectionId?: string;
  academicYearId?: string;
  subjectId?: string;
}

export abstract class EvaluationRepositoryPort {
  abstract findAll(filter?: EvaluationFilter): Promise<Evaluation[]>;
  abstract findById(id: string): Promise<Evaluation | null>;
  abstract save(evaluation: Evaluation): Promise<void>;
}
