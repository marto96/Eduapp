import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EditFeeScheduleUseCase } from './edit-fee-schedule.use-case';
import { FeeScheduleRepositoryPort } from '../ports/fee-schedule.repository.port';
import { FeeSchedule } from '../../domain/entities/fee-schedule.entity';

describe('EditFeeScheduleUseCase', () => {
  const feeSchedules: jest.Mocked<FeeScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new EditFeeScheduleUseCase(feeSchedules);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si el id no existe', async () => {
    feeSchedules.findById.mockResolvedValue(null);

    await expect(useCase.execute('fs-1', { amount: 180000 })).rejects.toThrow(NotFoundException);
    expect(feeSchedules.save).not.toHaveBeenCalled();
  });

  it('actualiza el monto correctamente', async () => {
    feeSchedules.findById.mockResolvedValue(new FeeSchedule('fs-1', 'grade-1', 'year-2027', 'pension', 150000));

    const result = await useCase.execute('fs-1', { amount: 180000 });

    expect(result.amount).toBe(180000);
    expect(feeSchedules.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza monto inválido traducido a BadRequestException', async () => {
    feeSchedules.findById.mockResolvedValue(new FeeSchedule('fs-1', 'grade-1', 'year-2027', 'pension', 150000));

    await expect(useCase.execute('fs-1', { amount: 0 })).rejects.toThrow(BadRequestException);
    expect(feeSchedules.save).not.toHaveBeenCalled();
  });
});
