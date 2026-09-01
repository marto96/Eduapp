import { Section } from '../../domain/entities/section.entity';

export abstract class SectionRepositoryPort {
  abstract findAll(): Promise<Section[]>;
  abstract findById(id: string): Promise<Section | null>;
  abstract save(section: Section): Promise<void>;
}
