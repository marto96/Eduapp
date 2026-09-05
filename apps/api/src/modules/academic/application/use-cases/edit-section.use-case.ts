import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SectionRepositoryPort } from '../ports/section.repository.port';
import { Section } from '../../domain/entities/section.entity';

export interface EditSectionInput {
  name: string;
}

@Injectable()
export class EditSectionUseCase {
  constructor(@Inject(SectionRepositoryPort) private readonly sections: SectionRepositoryPort) {}

  async execute(id: string, input: EditSectionInput): Promise<Section> {
    const section = await this.sections.findById(id);
    if (!section) {
      throw new NotFoundException(`No existe la sección "${id}"`);
    }

    const siblings = (await this.sections.findAll()).filter((s) => s.id !== id);
    if (siblings.some((s) => s.gradeId === section.gradeId && s.name === input.name)) {
      throw new ConflictException(`Ya existe una sección llamada "${input.name}" en ese grado`);
    }

    section.edit(input.name);
    await this.sections.save(section);
    return section;
  }
}
