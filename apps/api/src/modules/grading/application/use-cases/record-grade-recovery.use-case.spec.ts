import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecordGradeRecoveryUseCase } from './record-grade-recovery.use-case';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeRecoveryRepositoryPort } from '../ports/grade-recovery.repository.port';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { Subject } from '../../../academic/domain/entities/subject.entity';
import { Period } from '../../../academic/domain/entities/period.entity';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { GradeRecovery } from '../../domain/entities/grade-recovery.entity';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('RecordGradeRecoveryUseCase', () => {
  const enrollments = { findAll: jest.fn(), findById: jest.fn(), findActiveByStudentAndYear: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EnrollmentRepositoryPort>;
  const subjects = { findAll: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<SubjectRepositoryPort>;
  const periods = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<PeriodRepositoryPort>;
  const evaluations = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EvaluationRepositoryPort>;
  const scores = { findAll: jest.fn(), upsertMany: jest.fn() } as unknown as jest.Mocked<GradeScoreRepositoryPort>;
  const recoveries = { findByKey: jest.fn(), findAll: jest.fn(), upsert: jest.fn() } as unknown as jest.Mocked<GradeRecoveryRepositoryPort>;
  const weightConfigRepo = { findFirst: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<GradeWeightConfigRepositoryPort>;
  const weightConfigService = new GradeWeightConfigService(weightConfigRepo);
  const enrollmentAccess = { canTeacherAccessSection: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new RecordGradeRecoveryUseCase(
    enrollments,
    subjects,
    periods,
    evaluations,
    scores,
    recoveries,
    weightConfigService,
    enrollmentAccess,
  );

  const enrollment = new Enrollment('enr-1', 'student-1', 'section-1', 'year-1', 'active');
  const docente: JwtPayload = { sub: 'docente-1', email: 'd@d.com', roles: ['docente'], tenantId: 't1' };
  const period = new Period('p1', 'year-1', 'Primer periodo', 1, 0.25, '2026-01-20', '2026-03-20');
  const input = { enrollmentId: 'enr-1', subjectId: 'subject-1', periodId: 'p1', score: 3.5 };

  beforeEach(() => {
    jest.clearAllMocks();
    enrollments.findById.mockResolvedValue(enrollment);
    enrollmentAccess.canTeacherAccessSection = jest.fn().mockResolvedValue(true);
    periods.findById.mockResolvedValue(period);
    subjects.findAll.mockResolvedValue([new Subject('subject-1', 'Biología', 'Ciencias')]);
    evaluations.findAll.mockResolvedValue([
      new Evaluation('eval-1', 'subject-1', 'section-1', 'year-1', 'p1', 'actividad', 5, 'Taller 1'),
    ]);
    scores.findAll.mockResolvedValue([new GradeScore('score-1', 'eval-1', 'enr-1', 2)]); // 2/5 -> 2 en escala 0-5, reprobado
    weightConfigRepo.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1, 3.0));
    recoveries.findByKey.mockResolvedValue(new GradeRecovery('rec-1', 'enr-1', 'subject-1', 'p1', 3.5));
  });

  it('rechaza si la matrícula no existe', async () => {
    enrollments.findById.mockResolvedValue(null);
    await expect(useCase.execute(input, docente)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el docente no tiene acceso a la sección', async () => {
    enrollmentAccess.canTeacherAccessSection = jest.fn().mockResolvedValue(false);
    await expect(useCase.execute(input, docente)).rejects.toThrow(ForbiddenException);
  });

  it('rechaza si el periodo no existe o no es de ese año lectivo', async () => {
    periods.findById.mockResolvedValue(null);
    await expect(useCase.execute(input, docente)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si la materia no existe', async () => {
    subjects.findAll.mockResolvedValue([]);
    await expect(useCase.execute(input, docente)).rejects.toThrow(NotFoundException);
  });

  it('rechaza una nota de recuperación fuera de rango', async () => {
    await expect(useCase.execute({ ...input, score: -1 }, docente)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute({ ...input, score: 5.1 }, docente)).rejects.toThrow(BadRequestException);
  });

  it('rechaza si la materia ya está aprobada en ese periodo', async () => {
    scores.findAll.mockResolvedValue([new GradeScore('score-1', 'eval-1', 'enr-1', 5)]); // 5/5 -> 5, aprobado
    await expect(useCase.execute(input, docente)).rejects.toThrow(ConflictException);
  });

  it('permite recuperar una materia sin ninguna evaluación cargada todavía', async () => {
    evaluations.findAll.mockResolvedValue([]);
    scores.findAll.mockResolvedValue([]);
    await useCase.execute(input, docente);
    expect(recoveries.upsert).toHaveBeenCalledTimes(1);
  });

  it('guarda la recuperación cuando la materia está reprobada y retorna el registro', async () => {
    const result = await useCase.execute(input, docente);

    expect(recoveries.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: 'enr-1', subjectId: 'subject-1', periodId: 'p1', score: 3.5 }),
    );
    expect(result).toEqual(new GradeRecovery('rec-1', 'enr-1', 'subject-1', 'p1', 3.5));
  });
});
