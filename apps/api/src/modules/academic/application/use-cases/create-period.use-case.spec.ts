import { BadRequestException } from '@nestjs/common';
import { CreatePeriodUseCase } from './create-period.use-case';
import { PeriodRepositoryPort } from '../ports/period.repository.port';
import { Period } from '../../domain/entities/period.entity';

describe('CreatePeriodUseCase', () => {
  const periods: jest.Mocked<PeriodRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new CreatePeriodUseCase(periods);

  beforeEach(() => jest.clearAllMocks());

  it('crea el periodo cuando los datos son válidos', async () => {
    periods.findAll.mockResolvedValue([]);

    const result = await useCase.execute({
      academicYearId: 'year-1',
      name: 'Primer periodo',
      order: 1,
      weight: 0.25,
      startDate: '2026-01-20',
      endDate: '2026-03-20',
    });

    expect(result.name).toBe('Primer periodo');
    expect(periods.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza si la suma de pesos del año lectivo superaría 100%', async () => {
    periods.findAll.mockResolvedValue([
      new Period('p1', 'year-1', 'P1', 1, 0.5, '2026-01-01', '2026-02-01'),
      new Period('p2', 'year-1', 'P2', 2, 0.4, '2026-02-01', '2026-03-01'),
    ]);

    await expect(
      useCase.execute({
        academicYearId: 'year-1',
        name: 'P3',
        order: 3,
        weight: 0.2,
        startDate: '2026-03-01',
        endDate: '2026-04-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza fechas o pesos inválidos traduciendo el error del dominio', async () => {
    periods.findAll.mockResolvedValue([]);

    await expect(
      useCase.execute({
        academicYearId: 'year-1',
        name: 'P1',
        order: 1,
        weight: 0.25,
        startDate: '2026-03-20',
        endDate: '2026-01-20',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
