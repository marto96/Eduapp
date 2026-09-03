import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateGradeUseCase } from './create-grade.use-case';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('CreateGradeUseCase', () => {
  const enrollments = { findAll: jest.fn(), findById: jest.fn(), findActiveByStudentAndYear: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EnrollmentRepositoryPort>;
  const evaluations = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EvaluationRepositoryPort>;
  const scores = { findAll: jest.fn(), upsertMany: jest.fn() } as unknown as jest.Mocked<GradeScoreRepositoryPort>;
  const enrollmentAccess = { canTeacherAccessSection: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new CreateGradeUseCase(enrollments, evaluations, scores, enrollmentAccess);

  const enrollment = new Enrollment('enr-1', 'student-1', 'section-1', 'year-1', 'active');
  const admin: JwtPayload = { sub: 'admin-1', roles: ['admin_institucion'], tenantId: 't1' } as JwtPayload;

  beforeEach(() => {
    jest.clearAllMocks();
    enrollments.findById.mockResolvedValue(enrollment);
    enrollmentAccess.canTeacherAccessSection = jest.fn().mockResolvedValue(true);
  });

  it('rechaza si la matrícula no existe', async () => {
    enrollments.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        'enr-x',
        { subjectId: 'subject-1', sectionId: 'section-1', periodId: 'p1', category: 'actividad', score: 4 },
        admin,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el docente no tiene acceso a esa sección', async () => {
    enrollmentAccess.canTeacherAccessSection = jest.fn().mockResolvedValue(false);

    await expect(
      useCase.execute(
        'enr-1',
        { subjectId: 'subject-1', sectionId: 'section-1', periodId: 'p1', category: 'actividad', score: 4 },
        admin,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza si sectionId no coincide con la sección real de la matrícula', async () => {
    await expect(
      useCase.execute(
        'enr-1',
        { subjectId: 'subject-1', sectionId: 'otra-sección', periodId: 'p1', category: 'actividad', score: 4 },
        admin,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('crea una evaluación nueva y la nota cuando no se pasa evaluationId', async () => {
    const result = await useCase.execute(
      'enr-1',
      {
        subjectId: 'subject-1',
        sectionId: 'section-1',
        periodId: 'p1',
        category: 'actividad',
        label: 'Taller 3',
        maxScore: 5,
        score: 4,
      },
      admin,
    );

    expect(evaluations.save).toHaveBeenCalledTimes(1);
    expect(scores.upsertMany).toHaveBeenCalledTimes(1);
    expect(result.score).toBe(4);
  });

  it('rechaza si la nota está fuera de rango de la evaluación nueva', async () => {
    await expect(
      useCase.execute(
        'enr-1',
        { subjectId: 'subject-1', sectionId: 'section-1', periodId: 'p1', category: 'actividad', maxScore: 5, score: 9 },
        admin,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('reutiliza una evaluación existente cuando se pasa evaluationId, validando que coincida', async () => {
    const existing = new Evaluation('eval-1', 'subject-1', 'section-1', 'year-1', 'p1', 'actividad', 5, 'Taller 1');
    evaluations.findById.mockResolvedValue(existing);

    const result = await useCase.execute(
      'enr-1',
      { subjectId: 'subject-1', sectionId: 'section-1', periodId: 'p1', category: 'actividad', evaluationId: 'eval-1', score: 3 },
      admin,
    );

    expect(evaluations.save).not.toHaveBeenCalled();
    expect(result.evaluationId).toBe('eval-1');
  });

  it('rechaza si evaluationId no pertenece a esa materia/periodo/categoría', async () => {
    const existing = new Evaluation('eval-1', 'otra-materia', 'section-1', 'year-1', 'p1', 'actividad', 5, null);
    evaluations.findById.mockResolvedValue(existing);

    await expect(
      useCase.execute(
        'enr-1',
        { subjectId: 'subject-1', sectionId: 'section-1', periodId: 'p1', category: 'actividad', evaluationId: 'eval-1', score: 3 },
        admin,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
