import { NotFoundException } from '@nestjs/common';
import { SetAdmissionsOpenUseCase } from './set-admissions-open.use-case';
import { AcademicYearRepositoryPort } from '../ports/academic-year.repository.port';
import { AcademicYear } from '../../domain/entities/academic-year.entity';

describe('SetAdmissionsOpenUseCase', () => {
  const years: jest.Mocked<AcademicYearRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };

  const useCase = new SetAdmissionsOpenUseCase(years);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rechaza si el año lectivo no existe', async () => {
    years.findById.mockResolvedValue(null);

    await expect(useCase.execute('year-1', true)).rejects.toThrow(NotFoundException);
    expect(years.save).not.toHaveBeenCalled();
  });

  it('abre admisiones para un año ya en curso', async () => {
    years.findById.mockResolvedValue(
      new AcademicYear('year-2026', '2026', '2026-03-01', '2026-12-15', 'active', false),
    );

    const result = await useCase.execute('year-2026', true);

    expect(result.admissionsOpen).toBe(true);
    expect(years.save).toHaveBeenCalledWith(expect.objectContaining({ admissionsOpen: true }));
  });

  it('cierra admisiones sin tocar el resto de campos', async () => {
    years.findById.mockResolvedValue(
      new AcademicYear('year-2027', '2027', '2027-01-04', '2027-12-20', 'active', true),
    );

    const result = await useCase.execute('year-2027', false);

    expect(result.admissionsOpen).toBe(false);
    expect(result.name).toBe('2027');
  });
});
