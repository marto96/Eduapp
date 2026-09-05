import { Enrollment } from '../../domain/entities/enrollment.entity';
import { PaginationParams } from '../../../../core/http/pagination.dto';

export interface EnrollmentFilter {
  studentId?: string;
  sectionId?: string;
  academicYearId?: string;
  /** Coincidencia parcial, sin distinguir mayúsculas, contra nombre o email del estudiante. */
  search?: string;
}

export interface PaginatedEnrollments {
  items: Enrollment[];
  total: number;
}

export abstract class EnrollmentRepositoryPort {
  abstract findAll(filter?: EnrollmentFilter): Promise<Enrollment[]>;
  /**
   * Separado de `findAll` a propósito: ese método lo usan más de media
   * docena de otros módulos (asistencia, calificaciones, reportes,
   * mensajería) esperando siempre un array plano — cambiar su forma de
   * retorno habría sido un cambio disruptivo enorme para algo que solo
   * necesita la pantalla de administración de matrículas.
   */
  abstract findAllPaginated(
    filter: EnrollmentFilter | undefined,
    pagination: PaginationParams,
  ): Promise<PaginatedEnrollments>;
  abstract findById(id: string): Promise<Enrollment | null>;
  abstract findActiveByStudentAndYear(
    studentId: string,
    academicYearId: string,
  ): Promise<Enrollment | null>;
  abstract save(enrollment: Enrollment): Promise<void>;
}
