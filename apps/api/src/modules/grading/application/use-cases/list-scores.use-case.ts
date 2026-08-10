import { Inject, Injectable } from '@nestjs/common';
import { GradeScoreFilter, GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeScore } from '../../domain/entities/grade-score.entity';

@Injectable()
export class ListScoresUseCase {
  constructor(
    @Inject(GradeScoreRepositoryPort) private readonly gradeScores: GradeScoreRepositoryPort,
  ) {}

  async execute(filter?: GradeScoreFilter): Promise<GradeScore[]> {
    return this.gradeScores.findAll(filter);
  }
}
