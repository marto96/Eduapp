import { AdmissionGradeClosure } from '../../domain/entities/admission-grade-closure.entity';

export abstract class AdmissionGradeClosureRepositoryPort {
  abstract findByGradeAndYear(
    gradeId: string,
    academicYearId: string,
  ): Promise<AdmissionGradeClosure | null>;
  abstract findByYear(academicYearId: string): Promise<AdmissionGradeClosure[]>;
  abstract save(closure: AdmissionGradeClosure): Promise<void>;
  abstract deleteByGradeAndYear(gradeId: string, academicYearId: string): Promise<void>;
}
