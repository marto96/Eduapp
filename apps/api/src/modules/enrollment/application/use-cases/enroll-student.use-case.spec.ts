import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EnrollStudentUseCase } from './enroll-student.use-case';
import { EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { OverdueBalanceCheckerPort } from '../ports/overdue-balance-checker.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { User } from '../../../identity/domain/entities/user.entity';
import { Enrollment } from '../../domain/entities/enrollment.entity';
import { SectionRepositoryPort } from '../../../academic/application/ports/section.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { Section } from '../../../academic/domain/entities/section.entity';
import { Grade } from '../../../academic/domain/entities/grade.entity';

describe('EnrollStudentUseCase', () => {
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const overdueBalanceChecker: jest.Mocked<OverdueBalanceCheckerPort> = {
    hasOverdueBalance: jest.fn(),
  };
  const sections: jest.Mocked<SectionRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const grades: jest.Mocked<GradeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };

  const useCase = new EnrollStudentUseCase(enrollments, users, overdueBalanceChecker, sections, grades);

  const student = () => new User('student-1', 's@s.com', 'hash', 'S', 'T', ['estudiante'], 'active');
  const input = { studentId: 'student-1', sectionId: 'section-1', academicYearId: 'year-2026' };

  beforeEach(() => {
    jest.clearAllMocks();
    sections.findById.mockResolvedValue(new Section('section-1', 'grade-1', 'A'));
    grades.findById.mockResolvedValue(new Grade('grade-1', 'Séptimo', 'Bachillerato', 7));
  });

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

  it('rechaza si la sección no existe', async () => {
    users.findById.mockResolvedValue(student());
    enrollments.findActiveByStudentAndYear.mockResolvedValue(null);
    sections.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(enrollments.save).not.toHaveBeenCalled();
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

  it('rechaza matricular a un estudiante en un grado inferior a uno que ya cursó', async () => {
    users.findById.mockResolvedValue(student());
    enrollments.findActiveByStudentAndYear.mockResolvedValue(null);
    enrollments.findAll.mockResolvedValue([
      new Enrollment('e-prev', 'student-1', 'section-old', 'year-2025', 'withdrawn'),
    ]);
    overdueBalanceChecker.hasOverdueBalance.mockResolvedValue(false);
    // Sección/grado objetivo (input): "Séptimo" (order 7, mock por defecto).
    // Sección/grado previo: "Octavo" (order 8) — mayor al objetivo.
    sections.findById.mockImplementation(async (id) =>
      id === 'section-1' ? new Section('section-1', 'grade-7', 'A') : new Section('section-old', 'grade-8', 'B'),
    );
    grades.findById.mockImplementation(async (id) =>
      id === 'grade-7' ? new Grade('grade-7', 'Séptimo', 'Bachillerato', 7) : new Grade('grade-8', 'Octavo', 'Bachillerato', 8),
    );

    await expect(useCase.execute(input)).rejects.toThrow(
      'No se puede matricular al estudiante en un grado anterior a uno que ya cursó',
    );
    expect(enrollments.save).not.toHaveBeenCalled();
  });

  it('permite repetir el mismo grado que ya cursó', async () => {
    users.findById.mockResolvedValue(student());
    enrollments.findActiveByStudentAndYear.mockResolvedValue(null);
    enrollments.findAll.mockResolvedValue([
      new Enrollment('e-prev', 'student-1', 'section-old', 'year-2025', 'withdrawn'),
    ]);
    overdueBalanceChecker.hasOverdueBalance.mockResolvedValue(false);
    sections.findById.mockResolvedValue(new Section('section-1', 'grade-7', 'A'));
    grades.findById.mockResolvedValue(new Grade('grade-7', 'Séptimo', 'Bachillerato', 7));

    const result = await useCase.execute(input);

    expect(result.status).toBe('active');
    expect(enrollments.save).toHaveBeenCalledTimes(1);
  });
});
