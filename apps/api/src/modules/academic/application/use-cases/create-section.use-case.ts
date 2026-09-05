import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { SectionRepositoryPort } from '../ports/section.repository.port';
import { Section } from '../../domain/entities/section.entity';

export interface CreateSectionInput {
  gradeId: string;
  name: string;
}

@Injectable()
export class CreateSectionUseCase {
  constructor(@Inject(SectionRepositoryPort) private readonly sections: SectionRepositoryPort) {}

  async execute(input: CreateSectionInput): Promise<Section> {
    const siblings = await this.sections.findAll();
    if (siblings.some((s) => s.gradeId === input.gradeId && s.name === input.name)) {
      throw new ConflictException(`Ya existe una sección llamada "${input.name}" en ese grado`);
    }

    const section = new Section(randomUUID(), input.gradeId, input.name);
    await this.sections.save(section);
    return section;
  }
}
