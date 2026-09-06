import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DistributeGradeIntoSectionsUseCase } from './distribute-grade-into-sections.use-case';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { SectionRepositoryPort } from '../../../academic/application/ports/section.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { StudentYearAverageService } from '../services/student-year-average.service';
import { Grade } from '../../../academic/domain/entities/grade.entity';
import { Section } from '../../../academic/domain/entities/section.entity';
import { AcademicYear } from '../../../academic/domain/entities/academic-year.entity';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { User } from '../../../identity/domain/entities/user.entity';

describe('DistributeGradeIntoSectionsUseCase', () => {
  const grades: jest.Mocked<GradeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };
  const sections: jest.Mocked<SectionRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
    hasEnrollments: jest.fn(),
  };
  const academicYears: jest.Mocked<AcademicYearRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
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
  const studentYearAverage = { compute: jest.fn() } as unknown as jest.Mocked<StudentYearAverageService>;

  const useCase = new DistributeGradeIntoSectionsUseCase(
    grades,
    sections,
    academicYears,
    enrollments,
    users,
    studentYearAverage,
  );

  const grade = new Grade('grade-noveno', 'Noveno', 'Bachillerato', 9);
  const section901 = new Section('section-901', 'grade-noveno', '901');
  const section902 = new Section('section-902', 'grade-noveno', '902');
  const year2026 = new AcademicYear('year-2026', '2026', '2026-01-01', '2026-12-15', 'active', true);
  const year2025 = new AcademicYear('year-2025', '2025', '2025-01-01', '2025-12-15', 'closed', false);

  const input = { gradeId: 'grade-noveno', academicYearId: 'year-2026', sectionIds: ['section-901', 'section-902'] };

  beforeEach(() => {
    jest.clearAllMocks();
    grades.findById.mockResolvedValue(grade);
    academicYears.findById.mockResolvedValue(year2026);
    academicYears.findAll.mockResolvedValue([year2025, year2026]);
    sections.findAll.mockResolvedValue([section901, section902]);
    users.findById.mockImplementation(async (id: string) =>
      new User(id, `${id}@test.com`, 'hash', 'Nombre', 'Apellido', ['estudiante'], 'active'),
    );
  });

  it('rechaza con menos de 2 secciones destino', async () => {
    await expect(
      useCase.execute({ ...input, sectionIds: ['section-901'] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza si el grado no existe', async () => {
    grades.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el año lectivo no existe', async () => {
    academicYears.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si una sección destino no existe', async () => {
    sections.findAll.mockResolvedValue([section901]);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si una sección destino no pertenece al grado', async () => {
    const otroGradoSection = new Section('section-otro', 'grade-decimo', '1001');
    sections.findAll.mockResolvedValue([section901, otroGradoSection]);

    await expect(
      useCase.execute({ ...input, sectionIds: ['section-901', 'section-otro'] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza si no hay matrículas activas para ese grado y año', async () => {
    enrollments.findAll.mockResolvedValue([]);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('reparte por promedio, usa la mediana para los sin historial, y solo reasigna a quien cambia de sección', async () => {
    const e1 = new Enrollment('enr-1', 'student-1', 'section-901', 'year-2026', 'active'); // antiguo, alto
    const e2 = new Enrollment('enr-2', 'student-2', 'section-901', 'year-2026', 'active'); // antiguo, bajo
    const e3 = new Enrollment('enr-3', 'student-3', 'section-901', 'year-2026', 'active'); // nuevo
    const e4 = new Enrollment('enr-4', 'student-4', 'section-902', 'year-2026', 'active'); // nuevo

    enrollments.findAll.mockImplementation(async (filter) => {
      if (filter?.academicYearId === 'year-2026') return [e1, e2, e3, e4];
      if (filter?.studentId === 'student-1') {
        return [new Enrollment('prev-1', 'student-1', 'section-901', 'year-2025', 'completed')];
      }
      if (filter?.studentId === 'student-2') {
        return [new Enrollment('prev-2', 'student-2', 'section-901', 'year-2025', 'completed')];
      }
      return []; // student-3 y student-4 no tienen matrícula previa -> nuevos
    });

    studentYearAverage.compute.mockImplementation(async (enrollmentId: string) => {
      if (enrollmentId === 'prev-1') return 4.8;
      if (enrollmentId === 'prev-2') return 3.0;
      return null;
    });

    const result = await useCase.execute(input);

    // Mediana de los promedios reales [4.8, 3.0] = 3.9 -> student-3 y student-4 usan 3.9.
    // Orden descendente (empate 3.9 se resuelve por orden de llegada, e3 antes que e4):
    // student-1(4.8), student-3(3.9), student-4(3.9), student-2(3.0).
    // Zigzag 2 grupos: ronda 0 (par) -> pos0=grupo0, pos1=grupo1; ronda 1 (impar) -> se invierte.
    // grupo0 = [student-1, student-2], grupo1 = [student-3, student-4].
    expect(result).toHaveLength(4);

    const byStudent = new Map(result.map((r) => [r.studentId, r]));
    expect(byStudent.get('student-1')).toMatchObject({
      newSectionId: 'section-901', previousSectionId: 'section-901', average: 4.8, isReturning: true,
    });
    expect(byStudent.get('student-2')).toMatchObject({
      newSectionId: 'section-901', previousSectionId: 'section-901', average: 3.0, isReturning: true,
    });
    expect(byStudent.get('student-3')).toMatchObject({
      newSectionId: 'section-902', previousSectionId: 'section-901', average: 3.9, isReturning: false,
    });
    expect(byStudent.get('student-4')).toMatchObject({
      newSectionId: 'section-902', previousSectionId: 'section-902', average: 3.9, isReturning: false,
    });

    // Solo student-3 cambia de sección (901 -> 902); el resto ya estaba en la sección que le tocó.
    expect(enrollments.save).toHaveBeenCalledTimes(1);
    expect(e3.sectionId).toBe('section-902');
    expect(e1.sectionId).toBe('section-901');
    expect(e2.sectionId).toBe('section-901');
    expect(e4.sectionId).toBe('section-902');
  });
});
