import { NotFoundException } from '@nestjs/common';
import { ListGradeAdmissionAvailabilityUseCase } from './list-grade-admission-availability.use-case';
import { AdmissionGradeClosureRepositoryPort } from '../ports/admission-grade-closure.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { FeeScheduleRepositoryPort } from '../../../finance/application/ports/fee-schedule.repository.port';
import { AdmissionGradeClosure } from '../../domain/entities/admission-grade-closure.entity';
import { Grade } from '../../../academic/domain/entities/grade.entity';
import { AcademicYear } from '../../../academic/domain/entities/academic-year.entity';
import { FeeSchedule } from '../../../finance/domain/entities/fee-schedule.entity';

describe('ListGradeAdmissionAvailabilityUseCase', () => {
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
  const feeSchedules: jest.Mocked<FeeScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new ListGradeAdmissionAvailabilityUseCase(closures, grades, academicYears, feeSchedules);

  beforeEach(() => {
    jest.clearAllMocks();
    academicYears.findById.mockResolvedValue(
      new AcademicYear('year-2026', '2026', '2026-01-01', '2026-12-15', 'active', true),
    );
    grades.findAll.mockResolvedValue([
      new Grade('grade-noveno', 'Noveno', 'Bachillerato', 9),
      new Grade('grade-decimo', 'Décimo', 'Bachillerato', 10),
    ]);
    feeSchedules.findAll.mockResolvedValue([
      new FeeSchedule('fs-1', 'grade-noveno', 'year-2026', 'solicitud_admision', 80000),
      new FeeSchedule('fs-2', 'grade-decimo', 'year-2026', 'solicitud_admision', 80000),
      new FeeSchedule('fs-3', 'grade-noveno', 'year-2027', 'solicitud_admision', 90000),
      new FeeSchedule('fs-4', 'grade-noveno', 'year-2026', 'pension', 200000),
    ]);
    closures.findByYear.mockResolvedValue([]);
  });

  it('rechaza si el año lectivo no existe', async () => {
    academicYears.findById.mockResolvedValue(null);

    await expect(useCase.execute('year-2026')).rejects.toThrow(NotFoundException);
  });

  it('solo incluye grados con precio de solicitud_admision para ese año, ordenados por nombre', async () => {
    const result = await useCase.execute('year-2026');

    expect(result).toEqual([
      { gradeId: 'grade-decimo', gradeName: 'Décimo', closed: false },
      { gradeId: 'grade-noveno', gradeName: 'Noveno', closed: false },
    ]);
  });

  it('marca closed=true para los grados con cierre explícito', async () => {
    closures.findByYear.mockResolvedValue([
      new AdmissionGradeClosure('closure-1', 'grade-noveno', 'year-2026', '2026-09-01T00:00:00.000Z'),
    ]);

    const result = await useCase.execute('year-2026');

    expect(result).toEqual([
      { gradeId: 'grade-decimo', gradeName: 'Décimo', closed: false },
      { gradeId: 'grade-noveno', gradeName: 'Noveno', closed: true },
    ]);
  });
});
