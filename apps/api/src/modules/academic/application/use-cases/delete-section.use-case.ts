import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SectionRepositoryPort } from '../ports/section.repository.port';

@Injectable()
export class DeleteSectionUseCase {
  constructor(@Inject(SectionRepositoryPort) private readonly sections: SectionRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const section = await this.sections.findById(id);
    if (!section) {
      throw new NotFoundException(`No existe la sección "${id}"`);
    }

    if (await this.sections.hasEnrollments(id)) {
      throw new BadRequestException('No se puede eliminar una sección que tiene estudiantes matriculados');
    }

    await this.sections.deleteById(id);
  }
}
