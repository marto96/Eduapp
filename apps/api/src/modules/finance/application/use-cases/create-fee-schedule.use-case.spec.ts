import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateFeeScheduleUseCase } from './create-fee-schedule.use-case';
import { FeeScheduleRepositoryPort } from '../ports/fee-schedule.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { Grade } from '../../../academic/domain/entities/grade.entity';
import { AcademicYear } from '../../../academic/domain/entities/academic-year.entity';
import { FeeSchedule } from '../../domain/entities/fee-schedule.entity';

describe('CreateFeeScheduleUseCase', () => {
  const feeSchedules: jest.Mocked<FeeScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const grades: jest.Mocked<GradeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const academicYears: jest.Mocked<AcademicYearRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };

  const useCase = new CreateFeeScheduleUseCase(feeSchedules, grades, academicYears);

  const input = { gradeId: 'grade-1', academicYearId: 'year-2027', concept: 'pension' as const, amount: 150000 };
  const grade = () => new Grade('grade-1', '3ro', 'primaria', 3);
  const year = () => new AcademicYear('year-2027', '2027', '2027-03-01', '2027-12-15', 'active');

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si el grado no existe', async () => {
    grades.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(feeSchedules.save).not.toHaveBeenCalled();
  });

  it('rechaza si el año lectivo no existe', async () => {
    grades.findById.mockResolvedValue(grade());
    academicYears.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(feeSchedules.save).not.toHaveBeenCalled();
  });

  it('rechaza si ya existe un precio para ese grado+año+concepto', async () => {
    grades.findById.mockResolvedValue(grade());
    academicYears.findById.mockResolvedValue(year());
    feeSchedules.findOne.mockResolvedValue(
      new FeeSchedule('fs-existing', 'grade-1', 'year-2027', 'pension', 100000),
    );

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(feeSchedules.save).not.toHaveBeenCalled();
  });

  it('rechaza monto inválido traducido a BadRequestException', async () => {
    grades.findById.mockResolvedValue(grade());
    academicYears.findById.mockResolvedValue(year());
    feeSchedules.findOne.mockResolvedValue(null);

    await expect(useCase.execute({ ...input, amount: 0 })).rejects.toThrow(BadRequestException);
    expect(feeSchedules.save).not.toHaveBeenCalled();
  });

  it('crea correctamente cuando no hay duplicado', async () => {
    grades.findById.mockResolvedValue(grade());
    academicYears.findById.mockResolvedValue(year());
    feeSchedules.findOne.mockResolvedValue(null);

    const result = await useCase.execute(input);

    expect(result.amount).toBe(150000);
    expect(feeSchedules.save).toHaveBeenCalledTimes(1);
  });

  it('traduce una violación de unicidad del save en ConflictException (condición de carrera)', async () => {
    grades.findById.mockResolvedValue(grade());
    academicYears.findById.mockResolvedValue(year());
    feeSchedules.findOne.mockResolvedValue(null);
    feeSchedules.save.mockRejectedValue({ code: '23505' });

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
  });
});
