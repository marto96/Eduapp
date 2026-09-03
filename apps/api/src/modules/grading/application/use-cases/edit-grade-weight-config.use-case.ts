import { BadRequestException, Injectable } from '@nestjs/common';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

export interface EditGradeWeightConfigInput {
  actividadWeight: number;
  evaluacionBimestralWeight: number;
  disciplinaWeight: number;
}

@Injectable()
export class EditGradeWeightConfigUseCase {
  constructor(private readonly configService: GradeWeightConfigService) {}

  async execute(input: EditGradeWeightConfigInput): Promise<GradeWeightConfig> {
    const config = await this.configService.getOrCreateDefault();
    try {
      config.edit(input.actividadWeight, input.evaluacionBimestralWeight, input.disciplinaWeight);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    await this.configService.save(config);
    return config;
  }
}
