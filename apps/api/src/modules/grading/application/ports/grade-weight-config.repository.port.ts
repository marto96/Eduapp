import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

export abstract class GradeWeightConfigRepositoryPort {
  abstract findFirst(): Promise<GradeWeightConfig | null>;
  abstract save(config: GradeWeightConfig): Promise<void>;
}
