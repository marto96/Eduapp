import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateChargeUseCase } from './create-charge.use-case';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { Charge } from '../../domain/entities/charge.entity';

describe('CreateChargeUseCase', () => {
  const charges: jest.Mocked<ChargeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new CreateChargeUseCase(charges, enrollments);

  const enrollment = () => new Enrollment('enr-1', 'student-1', 'section-1', 'year-2027', 'active');
  const baseInput = {
    enrollmentId: 'enr-1',
    description: 'Pensión marzo',
    amount: 150000,
    dueDate: '2027-03-10',
  };

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si la matrícula no existe', async () => {
    enrollments.findById.mockResolvedValue(null);

    await expect(useCase.execute({ ...baseInput, concept: 'otro' })).rejects.toThrow(NotFoundException);
    expect(charges.save).not.toHaveBeenCalled();
  });

  it('rechaza monto inválido traducido a BadRequestException', async () => {
    enrollments.findById.mockResolvedValue(enrollment());
    charges.findAll.mockResolvedValue([]);

    await expect(useCase.execute({ ...baseInput, concept: 'otro', amount: 0 })).rejects.toThrow(
      BadRequestException,
    );
    expect(charges.save).not.toHaveBeenCalled();
  });

  it('crea un cargo "otro" sin ningún chequeo de duplicado', async () => {
    enrollments.findById.mockResolvedValue(enrollment());
    charges.findAll.mockResolvedValue([
      new Charge('c-existing', 'enr-1', 'otro', 'Otro cargo', 50000, '2027-03-01'),
    ]);

    const result = await useCase.execute({ ...baseInput, concept: 'otro' });

    expect(result.concept).toBe('otro');
    expect(charges.save).toHaveBeenCalledTimes(1);
  });

  it('crea una matrícula cuando no hay una previa sin anular', async () => {
    enrollments.findById.mockResolvedValue(enrollment());
    charges.findAll.mockResolvedValue([]);

    const result = await useCase.execute({ ...baseInput, concept: 'matricula' });

    expect(result.concept).toBe('matricula');
    expect(charges.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza una matrícula si ya existe una sin anular para esa matrícula', async () => {
    enrollments.findById.mockResolvedValue(enrollment());
    charges.findAll.mockResolvedValue([
      new Charge('c-existing', 'enr-1', 'matricula', 'Matrícula', 800000, '2027-02-01'),
    ]);

    await expect(useCase.execute({ ...baseInput, concept: 'matricula' })).rejects.toThrow(ConflictException);
    expect(charges.save).not.toHaveBeenCalled();
  });

  it('crea una matrícula si la única existente está anulada', async () => {
    const voided = new Charge('c-existing', 'enr-1', 'matricula', 'Matrícula', 800000, '2027-02-01');
    voided.markVoided();
    enrollments.findById.mockResolvedValue(enrollment());
    charges.findAll.mockResolvedValue([voided]);

    const result = await useCase.execute({ ...baseInput, concept: 'matricula' });

    expect(result.concept).toBe('matricula');
    expect(charges.save).toHaveBeenCalledTimes(1);
  });

  it('crea una pensión cuando no hay otra en el mismo mes', async () => {
    enrollments.findById.mockResolvedValue(enrollment());
    charges.findAll.mockResolvedValue([]);

    const result = await useCase.execute({ ...baseInput, concept: 'pension' });

    expect(result.concept).toBe('pension');
    expect(charges.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza una pensión si ya existe otra sin anular con dueDate en el mismo mes', async () => {
    enrollments.findById.mockResolvedValue(enrollment());
    charges.findAll.mockResolvedValue([
      new Charge('c-existing', 'enr-1', 'pension', 'Pensión marzo', 150000, '2027-03-01'),
    ]);

    await expect(useCase.execute({ ...baseInput, concept: 'pension', dueDate: '2027-03-25' })).rejects.toThrow(
      ConflictException,
    );
    expect(charges.save).not.toHaveBeenCalled();
  });

  it('crea una pensión si la otra existente es de un mes distinto del mismo año', async () => {
    enrollments.findById.mockResolvedValue(enrollment());
    charges.findAll.mockResolvedValue([
      new Charge('c-existing', 'enr-1', 'pension', 'Pensión febrero', 150000, '2027-02-01'),
    ]);

    const result = await useCase.execute({ ...baseInput, concept: 'pension', dueDate: '2027-03-10' });

    expect(result.concept).toBe('pension');
    expect(charges.save).toHaveBeenCalledTimes(1);
  });

  it('crea una pensión si la otra existente es del mismo mes mas de un año distinto', async () => {
    enrollments.findById.mockResolvedValue(enrollment());
    charges.findAll.mockResolvedValue([
      new Charge('c-existing', 'enr-1', 'pension', 'Pensión marzo 2026', 150000, '2026-03-01'),
    ]);

    const result = await useCase.execute({ ...baseInput, concept: 'pension', dueDate: '2027-03-10' });

    expect(result.concept).toBe('pension');
    expect(charges.save).toHaveBeenCalledTimes(1);
  });

  it('crea una pensión si la única del mismo mes está anulada', async () => {
    const voided = new Charge('c-existing', 'enr-1', 'pension', 'Pensión marzo', 150000, '2027-03-01');
    voided.markVoided();
    enrollments.findById.mockResolvedValue(enrollment());
    charges.findAll.mockResolvedValue([voided]);

    const result = await useCase.execute({ ...baseInput, concept: 'pension', dueDate: '2027-03-25' });

    expect(result.concept).toBe('pension');
    expect(charges.save).toHaveBeenCalledTimes(1);
  });

  it('traduce una violación de unicidad del save en ConflictException para matrícula', async () => {
    enrollments.findById.mockResolvedValue(enrollment());
    charges.findAll.mockResolvedValue([]);
    charges.save.mockRejectedValue({ code: '23505' });

    await expect(useCase.execute({ ...baseInput, concept: 'matricula' })).rejects.toThrow(ConflictException);
  });

  it('traduce una violación de unicidad del save en ConflictException para pensión', async () => {
    enrollments.findById.mockResolvedValue(enrollment());
    charges.findAll.mockResolvedValue([]);
    charges.save.mockRejectedValue({ code: '23505' });

    await expect(useCase.execute({ ...baseInput, concept: 'pension' })).rejects.toThrow(ConflictException);
  });
});
