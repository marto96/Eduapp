import { Inject, Injectable } from '@nestjs/common';
import { SectionRepositoryPort } from '../ports/section.repository.port';
import { Section } from '../../domain/entities/section.entity';

@Injectable()
export class ListSectionsUseCase {
  constructor(@Inject(SectionRepositoryPort) private readonly sections: SectionRepositoryPort) {}

  async execute(): Promise<Section[]> {
    return this.sections.findAll();
  }
}
