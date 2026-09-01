import { ConflictException, NotFoundException } from '@nestjs/common';
import { EditChargeUseCase } from './edit-charge.use-case';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { Charge } from '../../domain/entities/charge.entity';

describe('EditChargeUseCase', () => {
  const charges: jest.Mocked<ChargeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new EditChargeUseCase(charges);

  const baseInput = { amount: 150000, description: 'Pensión marzo', dueDate: '2027-03-10' };

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si el cargo no existe', async () => {
    charges.findById.mockResolvedValue(null);

    await expect(useCase.execute('c1', baseInput)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el cargo ya está anulado', async () => {
    const charge = new Charge('c1', 'enr-1', 'pension', 'Pensión marzo', 150000, '2027-03-10');
    charge.markVoided();
    charges.findById.mockResolvedValue(charge);

    await expect(useCase.execute('c1', baseInput)).rejects.toThrow(ConflictException);
    expect(charges.save).not.toHaveBeenCalled();
  });

  it('edita un cargo de matrícula sin ningún chequeo de duplicado', async () => {
    charges.findById.mockResolvedValue(new Charge('c1', 'enr-1', 'matricula', 'Matrícula', 800000, '2027-02-01'));

    const result = await useCase.execute('c1', { ...baseInput, amount: 850000 });

    expect(result.amount).toBe(850000);
    expect(charges.save).toHaveBeenCalledTimes(1);
  });

  it('edita una pensión sin conflicto cuando no hay otra en el mes nuevo', async () => {
    charges.findById.mockResolvedValue(new Charge('c1', 'enr-1', 'pension', 'Pensión febrero', 150000, '2027-02-10'));
    charges.findAll.mockResolvedValue([]);

    const result = await useCase.execute('c1', { ...baseInput, dueDate: '2027-03-10' });

    expect(result.dueDate).toBe('2027-03-10');
    expect(charges.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza editar una pensión hacia un mes donde ya hay otra pensión sin anular', async () => {
    charges.findById.mockResolvedValue(new Charge('c1', 'enr-1', 'pension', 'Pensión febrero', 150000, '2027-02-10'));
    charges.findAll.mockResolvedValue([
      new Charge('c2', 'enr-1', 'pension', 'Pensión marzo', 150000, '2027-03-01'),
    ]);

    await expect(useCase.execute('c1', { ...baseInput, dueDate: '2027-03-10' })).rejects.toThrow(
      ConflictException,
    );
    expect(charges.save).not.toHaveBeenCalled();
  });

  it('no se choca consigo mismo al editar una pensión dentro del mismo mes', async () => {
    const charge = new Charge('c1', 'enr-1', 'pension', 'Pensión marzo', 150000, '2027-03-05');
    charges.findById.mockResolvedValue(charge);
    charges.findAll.mockResolvedValue([charge]);

    const result = await useCase.execute('c1', { ...baseInput, amount: 160000, dueDate: '2027-03-20' });

    expect(result.amount).toBe(160000);
    expect(charges.save).toHaveBeenCalledTimes(1);
  });

  it('permite editar hacia un mes con otra pensión si esa otra está anulada', async () => {
    const voided = new Charge('c2', 'enr-1', 'pension', 'Pensión marzo', 150000, '2027-03-01');
    voided.markVoided();
    charges.findById.mockResolvedValue(new Charge('c1', 'enr-1', 'pension', 'Pensión febrero', 150000, '2027-02-10'));
    charges.findAll.mockResolvedValue([voided]);

    const result = await useCase.execute('c1', { ...baseInput, dueDate: '2027-03-10' });

    expect(result.dueDate).toBe('2027-03-10');
    expect(charges.save).toHaveBeenCalledTimes(1);
  });

  it('traduce una violación de unicidad del save en ConflictException', async () => {
    charges.findById.mockResolvedValue(new Charge('c1', 'enr-1', 'pension', 'Pensión febrero', 150000, '2027-02-10'));
    charges.findAll.mockResolvedValue([]);
    charges.save.mockRejectedValue({ code: '23505' });

    await expect(useCase.execute('c1', { ...baseInput, dueDate: '2027-03-10' })).rejects.toThrow(
      ConflictException,
    );
  });
});
