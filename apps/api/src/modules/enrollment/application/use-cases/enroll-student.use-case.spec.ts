import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EnrollStudentUseCase } from './enroll-student.use-case';
import { EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { OverdueBalanceCheckerPort } from '../ports/overdue-balance-checker.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { User } from '../../../identity/domain/entities/user.entity';
import { Enrollment } from '../../domain/entities/enrollment.entity';

describe('EnrollStudentUseCase', () => {
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const overdueBalanceChecker: jest.Mocked<OverdueBalanceCheckerPort> = {
    hasOverdueBalance: jest.fn(),
  };

  const useCase = new EnrollStudentUseCase(enrollments, users, overdueBalanceChecker);

  const student = () => new User('student-1', 's@s.com', 'hash', 'S', 'T', ['estudiante'], 'active');
  const input = { studentId: 'student-1', sectionId: 'section-1', academicYearId: 'year-2026' };

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si el usuario no existe', async () => {
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el usuario no tiene rol estudiante', async () => {
    users.findById.mockResolvedValue(
      new User('u1', 'x@x.com', 'hash', 'A', 'B', ['docente'], 'active'),
    );

    await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
  });

  it('rechaza si ya tiene matrícula activa en ese año, sin llegar a chequear deuda', async () => {
    users.findById.mockResolvedValue(student());
    enrollments.findActiveByStudentAndYear.mockResolvedValue(
      new Enrollment('e1', 'student-1', 'section-1', 'year-2026', 'active'),
    );

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(overdueBalanceChecker.hasOverdueBalance).not.toHaveBeenCalled();
  });

  it('rechaza con el mensaje de cartera vencida si el estudiante tiene deuda', async () => {
    users.findById.mockResolvedValue(student());
    enrollments.findActiveByStudentAndYear.mockResolvedValue(null);
    enrollments.findAll.mockResolvedValue([
      new Enrollment('e-prev', 'student-1', 'section-old', 'year-2025', 'completed'),
    ]);
    overdueBalanceChecker.hasOverdueBalance.mockResolvedValue(true);

    await expect(useCase.execute(input)).rejects.toThrow(
      'El estudiante tiene cartera vencida y no puede matricularse hasta regularizar su situación',
    );
    expect(enrollments.save).not.toHaveBeenCalled();
  });

  it('matricula normalmente si no hay deuda vencida', async () => {
    users.findById.mockResolvedValue(student());
    enrollments.findActiveByStudentAndYear.mockResolvedValue(null);
    enrollments.findAll.mockResolvedValue([]);
    overdueBalanceChecker.hasOverdueBalance.mockResolvedValue(false);

    const result = await useCase.execute(input);

    expect(result.status).toBe('active');
    expect(result.studentId).toBe('student-1');
    expect(result.sectionId).toBe('section-1');
    expect(enrollments.save).toHaveBeenCalledTimes(1);
  });

  it('chequea deuda con las matrículas de todos los años lectivos del estudiante, no solo el actual', async () => {
    users.findById.mockResolvedValue(student());
    enrollments.findActiveByStudentAndYear.mockResolvedValue(null);
    enrollments.findAll.mockResolvedValue([
      new Enrollment('e-2024', 'student-1', 'section-a', 'year-2024', 'completed'),
      new Enrollment('e-2025', 'student-1', 'section-b', 'year-2025', 'withdrawn'),
    ]);
    overdueBalanceChecker.hasOverdueBalance.mockResolvedValue(false);

    await useCase.execute(input);

    expect(enrollments.findAll).toHaveBeenCalledWith({ studentId: 'student-1' });
    expect(overdueBalanceChecker.hasOverdueBalance).toHaveBeenCalledWith(['e-2024', 'e-2025']);
  });
});
