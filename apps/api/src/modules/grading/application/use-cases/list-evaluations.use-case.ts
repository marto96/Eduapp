import { Inject, Injectable } from '@nestjs/common';
import { EvaluationFilter, EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { Evaluation } from '../../domain/entities/evaluation.entity';

@Injectable()
export class ListEvaluationsUseCase {
  constructor(
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
  ) {}

  async execute(filter?: EvaluationFilter): Promise<Evaluation[]> {
    return this.evaluations.findAll(filter);
  }
}
