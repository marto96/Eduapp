import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionGradeClosureRepositoryPort } from '../ports/admission-grade-closure.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { FeeScheduleRepositoryPort } from '../../../finance/application/ports/fee-schedule.repository.port';

export interface GradeAdmissionAvailability {
  gradeId: string;
  gradeName: string;
  closed: boolean;
}

@Injectable()
export class ListGradeAdmissionAvailabilityUseCase {
  constructor(
    @Inject(AdmissionGradeClosureRepositoryPort) private readonly closures: AdmissionGradeClosureRepositoryPort,
    @Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort,
    @Inject(AcademicYearRepositoryPort) private readonly academicYears: AcademicYearRepositoryPort,
    @Inject(FeeScheduleRepositoryPort) private readonly feeSchedules: FeeScheduleRepositoryPort,
  ) {}

  async execute(academicYearId: string): Promise<GradeAdmissionAvailability[]> {
    const year = await this.academicYears.findById(academicYearId);
    if (!year) {
      throw new NotFoundException(`No existe el año lectivo "${academicYearId}"`);
    }

    const [allFeeSchedules, allGrades, closedForYear] = await Promise.all([
      this.feeSchedules.findAll(),
      this.grades.findAll(),
      this.closures.findByYear(academicYearId),
    ]);

    const closedGradeIds = new Set(closedForYear.map((c) => c.gradeId));
    const gradesById = new Map(allGrades.map((grade) => [grade.id, grade]));

    const offeredGradeIds = allFeeSchedules
      .filter((fs) => fs.academicYearId === academicYearId && fs.concept === 'solicitud_admision')
      .map((fs) => fs.gradeId);

    return offeredGradeIds
      .map((gradeId) => {
        const grade = gradesById.get(gradeId);
        if (!grade) return null;
        return { gradeId, gradeName: grade.name, closed: closedGradeIds.has(gradeId) };
      })
      .filter((item): item is GradeAdmissionAvailability => item !== null)
      .sort((a, b) => a.gradeName.localeCompare(b.gradeName));
  }
}
