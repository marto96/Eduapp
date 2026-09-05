import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionGradeClosureRepositoryPort } from '../ports/admission-grade-closure.repository.port';
import { AdmissionGradeClosure } from '../../domain/entities/admission-grade-closure.entity';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';

@Injectable()
export class SetAdmissionGradeClosedUseCase {
  constructor(
    @Inject(AdmissionGradeClosureRepositoryPort) private readonly closures: AdmissionGradeClosureRepositoryPort,
    @Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort,
    @Inject(AcademicYearRepositoryPort) private readonly academicYears: AcademicYearRepositoryPort,
  ) {}

  async execute(gradeId: string, academicYearId: string, closed: boolean): Promise<void> {
    const grade = await this.grades.findById(gradeId);
    if (!grade) {
      throw new NotFoundException(`No existe el grado "${gradeId}"`);
    }

    const year = await this.academicYears.findById(academicYearId);
    if (!year) {
      throw new NotFoundException(`No existe el año lectivo "${academicYearId}"`);
    }

    const existing = await this.closures.findByGradeAndYear(gradeId, academicYearId);

    if (closed) {
      if (!existing) {
        await this.closures.save(
          new AdmissionGradeClosure(randomUUID(), gradeId, academicYearId, new Date().toISOString()),
        );
      }
      return;
    }

    if (existing) {
      await this.closures.deleteByGradeAndYear(gradeId, academicYearId);
    }
  }
}
