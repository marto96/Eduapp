import { Section } from '../../domain/entities/section.entity';

export abstract class SectionRepositoryPort {
  abstract findAll(): Promise<Section[]>;
  abstract save(section: Section): Promise<void>;
}
