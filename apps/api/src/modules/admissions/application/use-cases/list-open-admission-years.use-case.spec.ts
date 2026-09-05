import { ListOpenAdmissionYearsUseCase } from './list-open-admission-years.use-case';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { AcademicYear } from '../../../academic/domain/entities/academic-year.entity';

describe('ListOpenAdmissionYearsUseCase', () => {
  const years: jest.Mocked<AcademicYearRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };

  const useCase = new ListOpenAdmissionYearsUseCase(years);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve solo los años con admisiones abiertas, sin exponer el resto de campos', async () => {
    years.findAll.mockResolvedValue([
      new AcademicYear('year-2026', '2026', '2026-03-01', '2026-12-15', 'active', false),
      new AcademicYear('year-2027', '2027', '2027-01-04', '2027-12-20', 'active', true),
    ]);

    const result = await useCase.execute();

    expect(result).toEqual([{ id: 'year-2027', name: '2027' }]);
  });

  it('devuelve una lista vacía si ningún año tiene admisiones abiertas', async () => {
    years.findAll.mockResolvedValue([
      new AcademicYear('year-2026', '2026', '2026-03-01', '2026-12-15', 'active', false),
    ]);

    await expect(useCase.execute()).resolves.toEqual([]);
  });

  it('permite varios años abiertos a la vez', async () => {
    years.findAll.mockResolvedValue([
      new AcademicYear('year-2026', '2026', '2026-03-01', '2026-12-15', 'active', true),
      new AcademicYear('year-2027', '2027', '2027-01-04', '2027-12-20', 'active', true),
    ]);

    const result = await useCase.execute();

    expect(result).toEqual([
      { id: 'year-2026', name: '2026' },
      { id: 'year-2027', name: '2027' },
    ]);
  });
});
