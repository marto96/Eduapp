import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeleteGradeUseCase } from './delete-grade.use-case';
import { GradeRepositoryPort } from '../ports/grade.repository.port';
import { SectionRepositoryPort } from '../ports/section.repository.port';
import { Grade } from '../../domain/entities/grade.entity';
import { Section } from '../../domain/entities/section.entity';

describe('DeleteGradeUseCase', () => {
  const grades: jest.Mocked<GradeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };
  const sections: jest.Mocked<SectionRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
    hasEnrollments: jest.fn(),
  };

  const useCase = new DeleteGradeUseCase(grades, sections);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si el grado no existe', async () => {
    grades.findById.mockResolvedValue(null);

    await expect(useCase.execute('grade-1')).rejects.toThrow(NotFoundException);
    expect(grades.deleteById).not.toHaveBeenCalled();
  });

  it('rechaza si el grado tiene secciones asignadas', async () => {
    grades.findById.mockResolvedValue(new Grade('grade-1', '1er grado', 'Primaria', 1));
    sections.findAll.mockResolvedValue([new Section('section-1', 'grade-1', 'A')]);

    await expect(useCase.execute('grade-1')).rejects.toThrow(BadRequestException);
    expect(grades.deleteById).not.toHaveBeenCalled();
  });

  it('elimina correctamente cuando no tiene secciones asignadas', async () => {
    grades.findById.mockResolvedValue(new Grade('grade-1', '1er grado', 'Primaria', 1));
    sections.findAll.mockResolvedValue([new Section('section-1', 'grade-2', 'A')]);

    await useCase.execute('grade-1');

    expect(grades.deleteById).toHaveBeenCalledWith('grade-1');
  });
});
