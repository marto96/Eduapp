import { Inject, Injectable } from '@nestjs/common';
import { GradeRepositoryPort } from '../ports/grade.repository.port';
import { Grade } from '../../domain/entities/grade.entity';

@Injectable()
export class ListGradesUseCase {
  constructor(@Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort) {}

  async execute(): Promise<Grade[]> {
    return this.grades.findAll();
  }
}
