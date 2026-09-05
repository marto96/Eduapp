import { ConflictException } from '@nestjs/common';
import { CreateSectionUseCase } from './create-section.use-case';
import { SectionRepositoryPort } from '../ports/section.repository.port';
import { Section } from '../../domain/entities/section.entity';

describe('CreateSectionUseCase', () => {
  const sections: jest.Mocked<SectionRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
    hasEnrollments: jest.fn(),
  };

  const useCase = new CreateSectionUseCase(sections);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si ya existe una sección con ese nombre en el mismo grado', async () => {
    sections.findAll.mockResolvedValue([new Section('s-1', 'grade-1', 'A')]);

    await expect(useCase.execute({ gradeId: 'grade-1', name: 'A' })).rejects.toThrow(ConflictException);
    expect(sections.save).not.toHaveBeenCalled();
  });

  it('permite el mismo nombre en un grado distinto', async () => {
    sections.findAll.mockResolvedValue([new Section('s-1', 'grade-1', 'A')]);

    const result = await useCase.execute({ gradeId: 'grade-2', name: 'A' });

    expect(result.name).toBe('A');
    expect(sections.save).toHaveBeenCalledTimes(1);
  });

  it('crea correctamente cuando no hay duplicado', async () => {
    sections.findAll.mockResolvedValue([]);

    const result = await useCase.execute({ gradeId: 'grade-1', name: 'B' });

    expect(result.gradeId).toBe('grade-1');
    expect(result.name).toBe('B');
    expect(sections.save).toHaveBeenCalledTimes(1);
  });
});
