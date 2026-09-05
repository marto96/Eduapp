import { ConflictException, NotFoundException } from '@nestjs/common';
import { EditSectionUseCase } from './edit-section.use-case';
import { SectionRepositoryPort } from '../ports/section.repository.port';
import { Section } from '../../domain/entities/section.entity';

describe('EditSectionUseCase', () => {
  const sections: jest.Mocked<SectionRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
    hasEnrollments: jest.fn(),
  };

  const useCase = new EditSectionUseCase(sections);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si la sección no existe', async () => {
    sections.findById.mockResolvedValue(null);

    await expect(useCase.execute('s-1', { name: 'A' })).rejects.toThrow(NotFoundException);
    expect(sections.save).not.toHaveBeenCalled();
  });

  it('rechaza si otra sección del mismo grado ya tiene ese nombre', async () => {
    sections.findById.mockResolvedValue(new Section('s-1', 'grade-1', 'A'));
    sections.findAll.mockResolvedValue([
      new Section('s-1', 'grade-1', 'A'),
      new Section('s-2', 'grade-1', 'B'),
    ]);

    await expect(useCase.execute('s-1', { name: 'B' })).rejects.toThrow(ConflictException);
    expect(sections.save).not.toHaveBeenCalled();
  });

  it('permite el mismo nombre en otro grado', async () => {
    sections.findById.mockResolvedValue(new Section('s-1', 'grade-1', 'A'));
    sections.findAll.mockResolvedValue([
      new Section('s-1', 'grade-1', 'A'),
      new Section('s-2', 'grade-2', 'B'),
    ]);

    const result = await useCase.execute('s-1', { name: 'B' });

    expect(result.name).toBe('B');
    expect(sections.save).toHaveBeenCalledTimes(1);
  });

  it('permite guardar el mismo nombre que ya tenía', async () => {
    sections.findById.mockResolvedValue(new Section('s-1', 'grade-1', 'A'));
    sections.findAll.mockResolvedValue([new Section('s-1', 'grade-1', 'A')]);

    const result = await useCase.execute('s-1', { name: 'A' });

    expect(result.name).toBe('A');
    expect(sections.save).toHaveBeenCalledTimes(1);
  });
});
