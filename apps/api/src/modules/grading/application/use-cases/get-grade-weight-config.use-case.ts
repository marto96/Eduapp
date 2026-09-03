import { Injectable } from '@nestjs/common';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

@Injectable()
export class GetGradeWeightConfigUseCase {
  constructor(private readonly configService: GradeWeightConfigService) {}

  async execute(): Promise<GradeWeightConfig> {
    return this.configService.getOrCreateDefault();
  }
}
