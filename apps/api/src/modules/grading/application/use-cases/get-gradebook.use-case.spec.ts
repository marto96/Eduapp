import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetGradebookUseCase } from './get-gradebook.use-case';
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
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { Section } from '../../../academic/domain/entities/section.entity';
import { Subject } from '../../../academic/domain/entities/subject.entity';
import { AcademicYear } from '../../../academic/domain/entities/academic-year.entity';
import { Period } from '../../../academic/domain/entities/period.entity';
import { Schedule } from '../../../schedule/domain/entities/schedule.entity';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { AttendanceRecord } from '../../../attendance/domain/entities/attendance-record.entity';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('GetGradebookUseCase', () => {
  const enrollments = { findAll: jest.fn(), findById: jest.fn(), findActiveByStudentAndYear: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EnrollmentRepositoryPort>;
  const users = { findAll: jest.fn(), findById: jest.fn(), findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<UserRepositoryPort>;
  const sections = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<SectionRepositoryPort>;
  const subjects = { findAll: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<SubjectRepositoryPort>;
  const academicYears = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<AcademicYearRepositoryPort>;
  const periods = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<PeriodRepositoryPort>;
  const schedules = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<ScheduleRepositoryPort>;
  const evaluations = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EvaluationRepositoryPort>;
  const scores = { findAll: jest.fn(), upsertMany: jest.fn() } as unknown as jest.Mocked<GradeScoreRepositoryPort>;
  const attendance = { findAll: jest.fn(), upsertMany: jest.fn() } as unknown as jest.Mocked<AttendanceRecordRepositoryPort>;
  const weightConfigRepo = { findFirst: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<GradeWeightConfigRepositoryPort>;
  const weightConfigService = new GradeWeightConfigService(weightConfigRepo);
  const enrollmentAccess = { resolveAccessibleEnrollmentIds: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new GetGradebookUseCase(
    enrollments,
    users,
    sections,
    subjects,
    academicYears,
    periods,
    schedules,
    evaluations,
    scores,
    attendance,
    weightConfigService,
    enrollmentAccess,
  );

  const enrollment = new Enrollment('enr-1', 'student-1', 'section-1', 'year-1', 'active');
  const admin: JwtPayload = { sub: 'admin-1', roles: ['admin_institucion'], tenantId: 't1' } as JwtPayload;

  beforeEach(() => {
    jest.clearAllMocks();
    enrollments.findById.mockResolvedValue(enrollment);
    enrollmentAccess.resolveAccessibleEnrollmentIds = jest.fn().mockResolvedValue(null);
    users.findById.mockResolvedValue({ id: 'student-1', fullName: 'Juan Pérez' } as never);
    sections.findById.mockResolvedValue(new Section('section-1', 'grade-1', 'Sexto Uno'));
    academicYears.findById.mockResolvedValue(
      new AcademicYear('year-1', '2026', new Date('2026-01-01'), new Date('2026-12-01'), 'active'),
    );
    periods.findAll.mockResolvedValue([
      new Period('p1', 'year-1', 'Primer periodo', 1, 0.25, '2026-01-20', '2026-03-20'),
      new Period('p2', 'year-1', 'Segundo periodo', 2, 0.25, '2026-03-21', '2026-05-20'),
    ]);
    schedules.findAll.mockResolvedValue([
      new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00'),
    ]);
    subjects.findAll.mockResolvedValue([new Subject('subject-1', 'Biología', 'Ciencias')]);
    evaluations.findAll.mockResolvedValue([
      new Evaluation('eval-1', 'subject-1', 'section-1', 'year-1', 'p1', 'actividad', 5, 'Taller 1'),
    ]);
    scores.findAll.mockResolvedValue([new GradeScore('score-1', 'eval-1', 'enr-1', 4)]);
    attendance.findAll.mockResolvedValue([
      new AttendanceRecord('att-1', 'enr-1', 'sched-1', '2026-02-10', 'ausente'),
    ]);
    weightConfigRepo.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1));
  });

  it('rechaza si la matrícula no existe', async () => {
    enrollments.findById.mockResolvedValue(null);

    await expect(useCase.execute('enr-x', admin)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el usuario no tiene acceso a esa matrícula', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds = jest.fn().mockResolvedValue(new Set(['otra-matricula']));

    await expect(useCase.execute('enr-1', admin)).rejects.toThrow(ForbiddenException);
  });

  it('arma el boletín con una materia, la nota del periodo con datos y "-" en el que no tiene evaluaciones', async () => {
    const result = await useCase.execute('enr-1', admin);

    expect(result.studentName).toBe('Juan Pérez');
    expect(result.sectionName).toBe('Sexto Uno');
    expect(result.subjects).toHaveLength(1);

    const biologia = result.subjects[0];
    expect(biologia.subjectName).toBe('Biología');
    expect(biologia.periods[0].grade).toBeCloseTo(4, 5); // única categoría con datos -> redistribuida
    expect(biologia.periods[0].isPartial).toBe(true);
    expect(biologia.periods[0].absences).toBe(1);
    expect(biologia.periods[1].grade).toBeNull(); // sin evaluaciones en p2
    expect(biologia.periods[1].absences).toBe(0);
    // Acumulada: (4*0.25 + 0*0.25) / (0.25+0.25) = 1 / 0.5 = 2 — se normaliza
    // por la suma de los pesos de los periodos configurados (año todavía
    // sin los 4 periodos completos), no por 1 (fix #7).
    expect(biologia.accumulatedGrade).toBeCloseTo(2, 5);
    expect(biologia.accumulatedAbsences).toBe(1);
  });
});
