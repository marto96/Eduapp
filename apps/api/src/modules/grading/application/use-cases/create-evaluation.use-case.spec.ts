import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateEvaluationUseCase } from './create-evaluation.use-case';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { Period } from '../../../academic/domain/entities/period.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('CreateEvaluationUseCase', () => {
  const evaluations = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EvaluationRepositoryPort>;
  const periods = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<PeriodRepositoryPort>;
  const enrollmentAccess = { canTeacherAccessSection: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new CreateEvaluationUseCase(evaluations, periods, enrollmentAccess);

  const period = new Period('p1', 'year-1', 'Primer periodo', 1, 0.25, '2026-01-20', '2026-03-20');
  const admin: JwtPayload = { sub: 'admin-1', roles: ['admin_institucion'], tenantId: 't1' } as JwtPayload;

  beforeEach(() => {
    jest.clearAllMocks();
    periods.findById.mockResolvedValue(period);
    enrollmentAccess.canTeacherAccessSection = jest.fn().mockResolvedValue(true);
  });

  it('rechaza si el docente no tiene acceso a esa sección', async () => {
    enrollmentAccess.canTeacherAccessSection = jest.fn().mockResolvedValue(false);

    await expect(
      useCase.execute(
        {
          subjectId: 'subject-1',
          sectionId: 'section-1',
          academicYearId: 'year-1',
          periodId: 'p1',
          category: 'actividad',
        },
        admin,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza si el periodo no existe o no pertenece al año lectivo pasado', async () => {
    periods.findById.mockResolvedValue(
      new Period('p-otro-año', 'otro-year', 'Primer periodo', 1, 0.25, '2026-01-20', '2026-03-20'),
    );

    await expect(
      useCase.execute(
        {
          subjectId: 'subject-1',
          sectionId: 'section-1',
          academicYearId: 'year-1',
          periodId: 'p-otro-año',
          category: 'actividad',
        },
        admin,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(evaluations.save).not.toHaveBeenCalled();
  });

  it('rechaza si el periodo directamente no existe', async () => {
    periods.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        {
          subjectId: 'subject-1',
          sectionId: 'section-1',
          academicYearId: 'year-1',
          periodId: 'p-inexistente',
          category: 'actividad',
        },
        admin,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('crea la evaluación cuando el periodo pertenece al año lectivo', async () => {
    const result = await useCase.execute(
      {
        subjectId: 'subject-1',
        sectionId: 'section-1',
        academicYearId: 'year-1',
        periodId: 'p1',
        category: 'actividad',
        maxScore: 5,
        label: 'Taller 1',
      },
      admin,
    );

    expect(evaluations.save).toHaveBeenCalledTimes(1);
    expect(result.periodId).toBe('p1');
    expect(result.maxScore).toBe(5);
  });
});
