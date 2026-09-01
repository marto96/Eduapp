import { NotFoundException } from '@nestjs/common';
import { EditGradeUseCase } from './edit-grade.use-case';
import { GradeRepositoryPort } from '../ports/grade.repository.port';
import { Grade } from '../../domain/entities/grade.entity';

describe('EditGradeUseCase', () => {
  const grades: jest.Mocked<GradeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new EditGradeUseCase(grades);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si el id no existe', async () => {
    grades.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('grade-1', { name: '2do grado', level: 'Primaria', order: 2 }),
    ).rejects.toThrow(NotFoundException);
    expect(grades.save).not.toHaveBeenCalled();
  });

  it('actualiza nombre, nivel y orden correctamente', async () => {
    grades.findById.mockResolvedValue(new Grade('grade-1', '1er grado', 'Primaria', 1));

    const result = await useCase.execute('grade-1', { name: '2do grado', level: 'Secundaria', order: 2 });

    expect(result.name).toBe('2do grado');
    expect(result.level).toBe('Secundaria');
    expect(result.order).toBe(2);
    expect(grades.save).toHaveBeenCalledTimes(1);
  });
});
