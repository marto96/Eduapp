import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { SectionRepositoryPort } from '../../../academic/application/ports/section.repository.port';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { ScheduleRepositoryPort } from '../../../schedule/application/ports/schedule.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { AttendanceRecordRepositoryPort } from '../../../attendance/application/ports/attendance-record.repository.port';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeCalculationService, EvaluationItem } from '../../domain/services/grade-calculation.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface GradebookPeriodColumn {
  id: string;
  name: string;
  order: number;
  weight: number;
}

export interface GradebookPeriodCell {
  periodId: string;
  grade: number | null;
  isPartial: boolean;
  absences: number;
}

export interface GradebookSubjectRow {
  subjectId: string;
  subjectName: string;
  periods: GradebookPeriodCell[];
  accumulatedGrade: number;
  accumulatedAbsences: number;
}

export interface GradebookResponse {
  enrollmentId: string;
  studentName: string;
  sectionName: string;
  academicYearName: string;
  periods: GradebookPeriodColumn[];
  subjects: GradebookSubjectRow[];
}

@Injectable()
export class GetGradebookUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    @Inject(SectionRepositoryPort) private readonly sections: SectionRepositoryPort,
    @Inject(SubjectRepositoryPort) private readonly subjects: SubjectRepositoryPort,
    @Inject(AcademicYearRepositoryPort) private readonly academicYears: AcademicYearRepositoryPort,
    @Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort,
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    @Inject(GradeScoreRepositoryPort) private readonly scores: GradeScoreRepositoryPort,
    @Inject(AttendanceRecordRepositoryPort) private readonly attendance: AttendanceRecordRepositoryPort,
    private readonly weightConfigService: GradeWeightConfigService,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(enrollmentId: string, currentUser: JwtPayload): Promise<GradebookResponse> {
    const enrollment = await this.enrollments.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${enrollmentId}"`);
    }

    const allowed = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    if (allowed !== null && !allowed.has(enrollmentId)) {
      throw new ForbiddenException('No tenés acceso al boletín de este estudiante');
    }

    const [student, section, academicYear, periodsForYear, schedulesForSection, allSubjects, evaluationsForSection, scoresForEnrollment, attendanceForEnrollment, weights] =
      await Promise.all([
        this.users.findById(enrollment.studentId),
        this.sections.findById(enrollment.sectionId),
        this.academicYears.findById(enrollment.academicYearId),
        this.periods.findAll({ academicYearId: enrollment.academicYearId }),
        this.schedules.findAll({ sectionId: enrollment.sectionId, academicYearId: enrollment.academicYearId }),
        this.subjects.findAll(),
        this.evaluations.findAll({ sectionId: enrollment.sectionId, academicYearId: enrollment.academicYearId }),
        this.scores.findAll({ enrollmentId }),
        this.attendance.findAll({ enrollmentId }),
        this.weightConfigService.getOrCreateDefault(),
      ]);

    const sortedPeriods = [...periodsForYear].sort((a, b) => a.order - b.order);
    const scheduleSubjectMap = new Map(schedulesForSection.map((s) => [s.id, s.subjectId]));
    const subjectIds = [...new Set(schedulesForSection.map((s) => s.subjectId))];
    const subjectNameById = new Map(allSubjects.map((s) => [s.id, s.name]));
    const scoreByEvaluationId = new Map(scoresForEnrollment.map((s) => [s.evaluationId, s.score]));

    const absenceRecords = attendanceForEnrollment.filter((r) => r.status === 'ausente');
    const absencesBySubjectPeriod = GradeCalculationService.countAbsencesBySubjectAndPeriod(
      absenceRecords,
      scheduleSubjectMap,
      sortedPeriods.map((p) => ({ id: p.id, startDate: p.startDate, endDate: p.endDate })),
    );

    const subjectRows: GradebookSubjectRow[] = subjectIds
      .map((subjectId) => {
        const subjectEvaluations = evaluationsForSection.filter((e) => e.subjectId === subjectId);

        const periodCells: GradebookPeriodCell[] = sortedPeriods.map((period) => {
          const items: EvaluationItem[] = subjectEvaluations
            .filter((e) => e.periodId === period.id)
            .map((e) => ({
              evaluationId: e.id,
              category: e.category,
              label: e.label,
              maxScore: e.maxScore,
              rawScore: scoreByEvaluationId.get(e.id) ?? null,
            }));
          const { grade, isPartial } = GradeCalculationService.computeSubjectPeriodGrade(items, weights);
          const absences = absencesBySubjectPeriod.get(subjectId)?.get(period.id) ?? 0;
          return { periodId: period.id, grade, isPartial, absences };
        });

        const accumulatedGrade = GradeCalculationService.computeAccumulatedGrade(
          sortedPeriods.map((period, i) => ({ weight: period.weight, grade: periodCells[i].grade })),
        );
        const accumulatedAbsences = GradeCalculationService.computeAccumulatedAbsences(
          periodCells.map((c) => c.absences),
        );

        return {
          subjectId,
          subjectName: subjectNameById.get(subjectId) ?? subjectId,
          periods: periodCells,
          accumulatedGrade,
          accumulatedAbsences,
        };
      })
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    return {
      enrollmentId,
      studentName: student?.fullName ?? enrollment.studentId,
      sectionName: section?.name ?? enrollment.sectionId,
      academicYearName: academicYear?.name ?? enrollment.academicYearId,
      periods: sortedPeriods.map((p) => ({ id: p.id, name: p.name, order: p.order, weight: p.weight })),
      subjects: subjectRows,
    };
  }
}
