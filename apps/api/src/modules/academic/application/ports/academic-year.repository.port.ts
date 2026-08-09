import { AcademicYear } from '../../domain/entities/academic-year.entity';

export abstract class AcademicYearRepositoryPort {
  abstract findAll(): Promise<AcademicYear[]>;
  abstract findById(id: string): Promise<AcademicYear | null>;
  abstract save(year: AcademicYear): Promise<void>;
}
