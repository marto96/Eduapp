import { Enrollment } from '../../domain/entities/enrollment.entity';

export interface EnrollmentFilter {
  studentId?: string;
  sectionId?: string;
  academicYearId?: string;
}

export abstract class EnrollmentRepositoryPort {
  abstract findAll(filter?: EnrollmentFilter): Promise<Enrollment[]>;
  abstract findById(id: string): Promise<Enrollment | null>;
  abstract findActiveByStudentAndYear(
    studentId: string,
    academicYearId: string,
  ): Promise<Enrollment | null>;
  abstract save(enrollment: Enrollment): Promise<void>;
}
