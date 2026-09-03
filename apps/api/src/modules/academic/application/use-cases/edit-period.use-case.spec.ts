import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EditPeriodUseCase } from './edit-period.use-case';
import { PeriodRepositoryPort } from '../ports/period.repository.port';
import { Period } from '../../domain/entities/period.entity';

describe('EditPeriodUseCase', () => {
  const periods: jest.Mocked<PeriodRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new EditPeriodUseCase(periods);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si el id no existe', async () => {
    periods.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('p1', { name: 'P1', order: 1, weight: 0.25, startDate: '2026-01-01', endDate: '2026-02-01' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza si la nueva suma de pesos del año lectivo superaría 100%, excluyendo el propio periodo', async () => {
    const target = new Period('p1', 'year-1', 'P1', 1, 0.25, '2026-01-01', '2026-02-01');
    periods.findById.mockResolvedValue(target);
    periods.findAll.mockResolvedValue([
      target,
      new Period('p2', 'year-1', 'P2', 2, 0.5, '2026-02-01', '2026-03-01'),
    ]);

    await expect(
      useCase.execute('p1', { name: 'P1', order: 1, weight: 0.6, startDate: '2026-01-01', endDate: '2026-02-01' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('edita correctamente dentro del límite de 100%', async () => {
    const target = new Period('p1', 'year-1', 'P1', 1, 0.25, '2026-01-01', '2026-02-01');
    periods.findById.mockResolvedValue(target);
    periods.findAll.mockResolvedValue([
      target,
      new Period('p2', 'year-1', 'P2', 2, 0.5, '2026-02-01', '2026-03-01'),
    ]);

    const result = await useCase.execute('p1', {
      name: 'Primer periodo',
      order: 1,
      weight: 0.4,
      startDate: '2026-01-01',
      endDate: '2026-02-15',
    });

    expect(result.name).toBe('Primer periodo');
    expect(result.weight).toBe(0.4);
    expect(periods.save).toHaveBeenCalledTimes(1);
  });
});
