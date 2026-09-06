import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecordScoresUseCase } from './record-scores.use-case';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { NotifyNewGradeService } from '../services/notify-new-grade.service';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('RecordScoresUseCase', () => {
  const evaluations: jest.Mocked<EvaluationRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const gradeScores: jest.Mocked<GradeScoreRepositoryPort> = {
    findAll: jest.fn(),
    upsertMany: jest.fn(),
  };
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
  const enrollmentAccess = {
    canTeacherAccessSection: jest.fn(),
  } as unknown as jest.Mocked<EnrollmentAccessService>;
  const notifyNewGrade = { notify: jest.fn() } as unknown as jest.Mocked<NotifyNewGradeService>;

  const useCase = new RecordScoresUseCase(evaluations, gradeScores, enrollments, enrollmentAccess, notifyNewGrade);

  const evaluation = new Evaluation('eval-1', 'subj-mat', 'section-1', 'year-2026', 'period-1', 'actividad', 5, null);
  const currentUser = { sub: 'teacher-1', email: 't@test.com', roles: ['docente'] } as JwtPayload;

  const input = {
    evaluationId: 'eval-1',
    scores: [{ enrollmentId: 'enr-1', score: 4 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    evaluations.findById.mockResolvedValue(evaluation);
    enrollmentAccess.canTeacherAccessSection.mockResolvedValue(true);
    enrollments.findAll.mockResolvedValue([
      new Enrollment('enr-1', 'student-1', 'section-1', 'year-2026', 'active'),
    ]);
    gradeScores.findAll.mockResolvedValue([]);
  });

  it('rechaza si la evaluación no existe', async () => {
    evaluations.findById.mockResolvedValue(null);

    await expect(useCase.execute(input, currentUser)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el docente no tiene horario asignado en esa sección', async () => {
    enrollmentAccess.canTeacherAccessSection.mockResolvedValue(false);

    await expect(useCase.execute(input, currentUser)).rejects.toThrow(ForbiddenException);
  });

  it('rechaza una nota fuera de rango', async () => {
    await expect(
      useCase.execute({ evaluationId: 'eval-1', scores: [{ enrollmentId: 'enr-1', score: 6 }] }, currentUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza una matrícula que no pertenece a la sección/año de la evaluación', async () => {
    await expect(
      useCase.execute({ evaluationId: 'eval-1', scores: [{ enrollmentId: 'enr-otra', score: 4 }] }, currentUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('guarda la nota y notifica cuando es nueva', async () => {
    const result = await useCase.execute(input, currentUser);

    expect(gradeScores.upsertMany).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(notifyNewGrade.notify).toHaveBeenCalledWith(evaluation, 'enr-1', 4, 'teacher-1');
  });

  it('no notifica si la nota ya existía (es una edición)', async () => {
    gradeScores.findAll.mockResolvedValue([
      new GradeScore('score-existente', 'eval-1', 'enr-1', 3),
    ]);

    await useCase.execute(input, currentUser);

    expect(gradeScores.upsertMany).toHaveBeenCalledTimes(1);
    expect(notifyNewGrade.notify).not.toHaveBeenCalled();
  });

  it('notifica solo las matrículas nuevas dentro de un lote mixto', async () => {
    gradeScores.findAll.mockResolvedValue([
      new GradeScore('score-existente', 'eval-1', 'enr-1', 3),
    ]);
    enrollments.findAll.mockResolvedValue([
      new Enrollment('enr-1', 'student-1', 'section-1', 'year-2026', 'active'),
      new Enrollment('enr-2', 'student-2', 'section-1', 'year-2026', 'active'),
    ]);

    await useCase.execute(
      {
        evaluationId: 'eval-1',
        scores: [
          { enrollmentId: 'enr-1', score: 4 }, // edición
          { enrollmentId: 'enr-2', score: 5 }, // nueva
        ],
      },
      currentUser,
    );

    expect(notifyNewGrade.notify).toHaveBeenCalledTimes(1);
    expect(notifyNewGrade.notify).toHaveBeenCalledWith(evaluation, 'enr-2', 5, 'teacher-1');
  });
});
