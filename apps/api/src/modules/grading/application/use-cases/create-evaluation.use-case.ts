import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { Evaluation, EvaluationType } from '../../domain/entities/evaluation.entity';

export interface CreateEvaluationInput {
  subjectId: string;
  sectionId: string;
  academicYearId: string;
  period: string;
  type: EvaluationType;
  maxScore?: number;
}

@Injectable()
export class CreateEvaluationUseCase {
  constructor(
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
  ) {}

  async execute(input: CreateEvaluationInput): Promise<Evaluation> {
    const evaluation = new Evaluation(
      randomUUID(),
      input.subjectId,
      input.sectionId,
      input.academicYearId,
      input.period,
      input.type,
      input.maxScore ?? 10,
    );

    await this.evaluations.save(evaluation);
    return evaluation;
  }
}
