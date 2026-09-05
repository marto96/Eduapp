import { NotFoundException } from '@nestjs/common';
import { SetAdmissionGradeClosedUseCase } from './set-admission-grade-closed.use-case';
import { AdmissionGradeClosureRepositoryPort } from '../ports/admission-grade-closure.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { AdmissionGradeClosure } from '../../domain/entities/admission-grade-closure.entity';
import { Grade } from '../../../academic/domain/entities/grade.entity';
import { AcademicYear } from '../../../academic/domain/entities/academic-year.entity';

describe('SetAdmissionGradeClosedUseCase', () => {
  const closures: jest.Mocked<AdmissionGradeClosureRepositoryPort> = {
    findByGradeAndYear: jest.fn(),
    findByYear: jest.fn(),
    save: jest.fn(),
    deleteByGradeAndYear: jest.fn(),
  };
  const grades: jest.Mocked<GradeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };
  const academicYears: jest.Mocked<AcademicYearRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };

  const useCase = new SetAdmissionGradeClosedUseCase(closures, grades, academicYears);

  beforeEach(() => {
    jest.clearAllMocks();
    grades.findById.mockResolvedValue(new Grade('grade-1', 'Noveno', 'Bachillerato', 9));
    academicYears.findById.mockResolvedValue(
      new AcademicYear('year-2026', '2026', '2026-01-01', '2026-12-15', 'active', true),
    );
  });

  it('rechaza si el grado no existe', async () => {
    grades.findById.mockResolvedValue(null);

    await expect(useCase.execute('grade-1', 'year-2026', true)).rejects.toThrow(NotFoundException);
    expect(closures.save).not.toHaveBeenCalled();
  });

  it('rechaza si el año lectivo no existe', async () => {
    academicYears.findById.mockResolvedValue(null);

    await expect(useCase.execute('grade-1', 'year-2026', true)).rejects.toThrow(NotFoundException);
  });

  it('cierra el grado si no había cierre previo', async () => {
    closures.findByGradeAndYear.mockResolvedValue(null);

    await useCase.execute('grade-1', 'year-2026', true);

    expect(closures.save).toHaveBeenCalledWith(
      expect.objectContaining({ gradeId: 'grade-1', academicYearId: 'year-2026' }),
    );
  });

  it('cerrar un grado ya cerrado no duplica la fila', async () => {
    closures.findByGradeAndYear.mockResolvedValue(
      new AdmissionGradeClosure('closure-1', 'grade-1', 'year-2026', '2026-09-01T00:00:00.000Z'),
    );

    await useCase.execute('grade-1', 'year-2026', true);

    expect(closures.save).not.toHaveBeenCalled();
  });

  it('reabre el grado borrando el cierre existente', async () => {
    closures.findByGradeAndYear.mockResolvedValue(
      new AdmissionGradeClosure('closure-1', 'grade-1', 'year-2026', '2026-09-01T00:00:00.000Z'),
    );

    await useCase.execute('grade-1', 'year-2026', false);

    expect(closures.deleteByGradeAndYear).toHaveBeenCalledWith('grade-1', 'year-2026');
  });

  it('reabrir un grado que ya estaba abierto es un no-op', async () => {
    closures.findByGradeAndYear.mockResolvedValue(null);

    await useCase.execute('grade-1', 'year-2026', false);

    expect(closures.deleteByGradeAndYear).not.toHaveBeenCalled();
  });
});
