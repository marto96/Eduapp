import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GradeRepositoryPort } from '../ports/grade.repository.port';
import { Grade } from '../../domain/entities/grade.entity';

export interface EditGradeInput {
  name: string;
  level: string;
  order: number;
}

@Injectable()
export class EditGradeUseCase {
  constructor(@Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort) {}

  async execute(id: string, input: EditGradeInput): Promise<Grade> {
    const grade = await this.grades.findById(id);
    if (!grade) {
      throw new NotFoundException(`No existe el grado "${id}"`);
    }
    grade.edit(input.name, input.level, input.order);
    await this.grades.save(grade);
    return grade;
  }
}
