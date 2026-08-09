import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { GradeRepositoryPort } from '../ports/grade.repository.port';
import { Grade } from '../../domain/entities/grade.entity';

export interface CreateGradeInput {
  name: string;
  level: string;
}

@Injectable()
export class CreateGradeUseCase {
  constructor(@Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort) {}

  async execute(input: CreateGradeInput): Promise<Grade> {
    const grade = new Grade(randomUUID(), input.name, input.level);
    await this.grades.save(grade);
    return grade;
  }
}
