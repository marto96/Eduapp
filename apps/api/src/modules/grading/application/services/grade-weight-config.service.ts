import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

const DEFAULT_ACTIVIDAD_WEIGHT = 0.65;
const DEFAULT_EVALUACION_BIMESTRAL_WEIGHT = 0.25;
const DEFAULT_DISCIPLINA_WEIGHT = 0.1;

@Injectable()
export class GradeWeightConfigService {
  constructor(
    @Inject(GradeWeightConfigRepositoryPort) private readonly configs: GradeWeightConfigRepositoryPort,
  ) {}

  async getOrCreateDefault(): Promise<GradeWeightConfig> {
    const existing = await this.configs.findFirst();
    if (existing) return existing;

    const config = new GradeWeightConfig(
      randomUUID(),
      DEFAULT_ACTIVIDAD_WEIGHT,
      DEFAULT_EVALUACION_BIMESTRAL_WEIGHT,
      DEFAULT_DISCIPLINA_WEIGHT,
    );
    await this.configs.save(config);
    return config;
  }

  async save(config: GradeWeightConfig): Promise<void> {
    await this.configs.save(config);
  }
}
