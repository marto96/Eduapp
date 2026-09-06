import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { SectionRepositoryPort } from '../../../academic/application/ports/section.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { StudentYearAverageService } from '../services/student-year-average.service';
import { SectionDistributionService, DistributableStudent } from '../../domain/services/section-distribution.service';

export interface DistributeGradeIntoSectionsInput {
  gradeId: string;
  academicYearId: string;
  sectionIds: string[];
}

export interface DistributeGradeIntoSectionsResultRow {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  previousSectionId: string;
  previousSectionName: string;
  newSectionId: string;
  newSectionName: string;
  average: number | null;
  isReturning: boolean;
}

@Injectable()
export class DistributeGradeIntoSectionsUseCase {
  constructor(
    @Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort,
    @Inject(SectionRepositoryPort) private readonly sections: SectionRepositoryPort,
    @Inject(AcademicYearRepositoryPort) private readonly academicYears: AcademicYearRepositoryPort,
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    private readonly studentYearAverage: StudentYearAverageService,
  ) {}

  async execute(input: DistributeGradeIntoSectionsInput): Promise<DistributeGradeIntoSectionsResultRow[]> {
    if (input.sectionIds.length < 2) {
      throw new BadRequestException('Se necesitan al menos 2 cursos destino para repartir');
    }

    const grade = await this.grades.findById(input.gradeId);
    if (!grade) {
      throw new NotFoundException(`No existe el grado "${input.gradeId}"`);
    }

    const targetYear = await this.academicYears.findById(input.academicYearId);
    if (!targetYear) {
      throw new NotFoundException(`No existe el año lectivo "${input.academicYearId}"`);
    }

    const allSections = await this.sections.findAll();
    const targetSections = input.sectionIds.map((id) => {
      const section = allSections.find((s) => s.id === id);
      if (!section) throw new NotFoundException(`No existe la sección "${id}"`);
      if (section.gradeId !== input.gradeId) {
        throw new BadRequestException(`La sección "${section.name}" no pertenece a este grado`);
      }
      return section;
    });

    const gradeSectionIds = new Set(allSections.filter((s) => s.gradeId === input.gradeId).map((s) => s.id));
    const currentEnrollments = (await this.enrollments.findAll({ academicYearId: input.academicYearId })).filter(
      (e) => e.status === 'active' && gradeSectionIds.has(e.sectionId),
    );

    if (currentEnrollments.length === 0) {
      throw new NotFoundException('No hay matrículas activas para ese grado en ese año lectivo');
    }

    const allYears = await this.academicYears.findAll();
    const yearStartDateById = new Map(allYears.map((y) => [y.id, y.startDate]));
    const targetStartDate = targetYear.startDate;

    const candidates: { enrollment: Enrollment; average: number | null; isReturning: boolean }[] = [];
    for (const enrollment of currentEnrollments) {
      const priorEnrollments = (await this.enrollments.findAll({ studentId: enrollment.studentId }))
        .filter((e) => e.status !== 'withdrawn' && e.academicYearId !== input.academicYearId)
        .filter((e) => (yearStartDateById.get(e.academicYearId) ?? '') < targetStartDate)
        .sort((a, b) =>
          (yearStartDateById.get(b.academicYearId) ?? '').localeCompare(yearStartDateById.get(a.academicYearId) ?? ''),
        );

      const mostRecentPrior = priorEnrollments[0] ?? null;
      const isReturning = mostRecentPrior !== null;
      const average = mostRecentPrior ? await this.studentYearAverage.compute(mostRecentPrior.id) : null;

      candidates.push({ enrollment, average, isReturning });
    }

    const realAverages = candidates.map((c) => c.average).filter((a): a is number => a !== null);
    const median = SectionDistributionService.median(realAverages);

    const distributable: DistributableStudent[] = candidates.map((c) => ({
      enrollmentId: c.enrollment.id,
      average: c.average ?? median,
    }));
    const resolvedAverageByEnrollmentId = new Map(distributable.map((d) => [d.enrollmentId, d.average]));

    const groups = SectionDistributionService.zigzagDistribute(distributable, targetSections.length);

    const result: DistributeGradeIntoSectionsResultRow[] = [];
    for (let i = 0; i < groups.length; i++) {
      const newSection = targetSections[i];
      for (const enrollmentId of groups[i]) {
        const candidate = candidates.find((c) => c.enrollment.id === enrollmentId)!;
        const enrollment = candidate.enrollment;
        const previousSection = allSections.find((s) => s.id === enrollment.sectionId)!;

        if (enrollment.sectionId !== newSection.id) {
          enrollment.reassignSection(newSection.id);
          await this.enrollments.save(enrollment);
        }

        const student = await this.users.findById(enrollment.studentId);

        result.push({
          studentId: enrollment.studentId,
          studentName: student?.fullName ?? enrollment.studentId,
          enrollmentId: enrollment.id,
          previousSectionId: previousSection.id,
          previousSectionName: previousSection.name,
          newSectionId: newSection.id,
          newSectionName: newSection.name,
          average: resolvedAverageByEnrollmentId.get(enrollment.id)!,
          isReturning: candidate.isReturning,
        });
      }
    }

    return result;
  }
}
