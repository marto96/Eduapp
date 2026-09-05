import { Section } from '../../domain/entities/section.entity';

export abstract class SectionRepositoryPort {
  abstract findAll(): Promise<Section[]>;
  abstract findById(id: string): Promise<Section | null>;
  abstract save(section: Section): Promise<void>;
  abstract deleteById(id: string): Promise<void>;
  /**
   * `Academic` no depende de `Enrollment` (sería circular — `Enrollment` ya
   * depende de `Academic`), así que esto no inyecta `EnrollmentRepositoryPort`
   * vía Nest: la implementación concreta consulta la tabla `enrollments`
   * directamente desde la capa de infraestructura, con el mismo
   * `TENANT_DATA_SOURCE` que ya usa este repositorio.
   */
  abstract hasEnrollments(sectionId: string): Promise<boolean>;
}
