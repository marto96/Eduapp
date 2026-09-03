import { NotFoundException } from '@nestjs/common';
import { GetSubjectPeriodDetailUseCase } from './get-subject-period-detail.use-case';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { Subject } from '../../../academic/domain/entities/subject.entity';
import { Period } from '../../../academic/domain/entities/period.entity';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('GetSubjectPeriodDetailUseCase', () => {
  const enrollments = { findAll: jest.fn(), findById: jest.fn(), findActiveByStudentAndYear: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EnrollmentRepositoryPort>;
  const subjects = { findAll: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<SubjectRepositoryPort>;
  const periods = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<PeriodRepositoryPort>;
  const evaluations = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EvaluationRepositoryPort>;
  const scores = { findAll: jest.fn(), upsertMany: jest.fn() } as unknown as jest.Mocked<GradeScoreRepositoryPort>;
  const weightConfigRepo = { findFirst: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<GradeWeightConfigRepositoryPort>;
  const weightConfigService = new GradeWeightConfigService(weightConfigRepo);
  const enrollmentAccess = { resolveAccessibleEnrollmentIds: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new GetSubjectPeriodDetailUseCase(
    enrollments,
    subjects,
    periods,
    evaluations,
    scores,
    weightConfigService,
    enrollmentAccess,
  );

  const enrollment = new Enrollment('enr-1', 'student-1', 'section-1', 'year-1', 'active');
  const admin: JwtPayload = { sub: 'admin-1', roles: ['admin_institucion'], tenantId: 't1' } as JwtPayload;
  const period = new Period('p1', 'year-1', 'Primer periodo', 1, 0.25, '2026-01-20', '2026-03-20');

  beforeEach(() => {
    jest.clearAllMocks();
    enrollments.findById.mockResolvedValue(enrollment);
    enrollmentAccess.resolveAccessibleEnrollmentIds = jest.fn().mockResolvedValue(null);
    periods.findById.mockResolvedValue(period);
    subjects.findAll.mockResolvedValue([new Subject('subject-1', 'Biología', 'Ciencias')]);
    evaluations.findAll.mockResolvedValue([
      new Evaluation('eval-1', 'subject-1', 'section-1', 'year-1', 'p1', 'actividad', 5, 'Taller 1'),
    ]);
    scores.findAll.mockResolvedValue([new GradeScore('score-1', 'eval-1', 'enr-1', 4)]);
    weightConfigRepo.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1));
  });

  it('rechaza si el periodo no existe o no es de ese año lectivo', async () => {
    periods.findById.mockResolvedValue(null);

    await expect(useCase.execute('enr-1', 'subject-1', 'p-x', admin)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si la materia no existe', async () => {
    subjects.findAll.mockResolvedValue([]);

    await expect(useCase.execute('enr-1', 'subject-x', 'p1', admin)).rejects.toThrow(NotFoundException);
  });

  it('devuelve el desglose por categoría con la evaluación cargada', async () => {
    const result = await useCase.execute('enr-1', 'subject-1', 'p1', admin);

    expect(result.subjectName).toBe('Biología');
    expect(result.periodName).toBe('Primer periodo');
    expect(result.grade).toBeCloseTo(4, 5);
    expect(result.isPartial).toBe(true);
    const actividad = result.categories.find((c) => c.category === 'actividad')!;
    expect(actividad.items).toEqual([
      { evaluationId: 'eval-1', category: 'actividad', label: 'Taller 1', maxScore: 5, rawScore: 4, normalized: 4 },
    ]);
  });
});
