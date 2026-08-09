import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
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
    const section = new Section(randomUUID(), input.gradeId, input.name);
    await this.sections.save(section);
    return section;
  }
}
