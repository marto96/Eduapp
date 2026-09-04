import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GradeRepositoryPort } from '../ports/grade.repository.port';
import { SectionRepositoryPort } from '../ports/section.repository.port';

@Injectable()
export class DeleteGradeUseCase {
  constructor(
    @Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort,
    @Inject(SectionRepositoryPort) private readonly sections: SectionRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const grade = await this.grades.findById(id);
    if (!grade) {
      throw new NotFoundException(`No existe el grado "${id}"`);
    }

    const sections = await this.sections.findAll();
    if (sections.some((section) => section.gradeId === id)) {
      throw new BadRequestException('No se puede eliminar un grado que tiene secciones asignadas');
    }

    await this.grades.deleteById(id);
  }
}
