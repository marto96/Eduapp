import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeleteSectionUseCase } from './delete-section.use-case';
import { SectionRepositoryPort } from '../ports/section.repository.port';
import { Section } from '../../domain/entities/section.entity';

describe('DeleteSectionUseCase', () => {
  const sections: jest.Mocked<SectionRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
    hasEnrollments: jest.fn(),
  };

  const useCase = new DeleteSectionUseCase(sections);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si la sección no existe', async () => {
    sections.findById.mockResolvedValue(null);

    await expect(useCase.execute('s-1')).rejects.toThrow(NotFoundException);
    expect(sections.deleteById).not.toHaveBeenCalled();
  });

  it('rechaza si la sección tiene estudiantes matriculados', async () => {
    sections.findById.mockResolvedValue(new Section('s-1', 'grade-1', 'A'));
    sections.hasEnrollments.mockResolvedValue(true);

    await expect(useCase.execute('s-1')).rejects.toThrow(BadRequestException);
    expect(sections.deleteById).not.toHaveBeenCalled();
  });

  it('elimina correctamente cuando no tiene estudiantes matriculados', async () => {
    sections.findById.mockResolvedValue(new Section('s-1', 'grade-1', 'A'));
    sections.hasEnrollments.mockResolvedValue(false);

    await useCase.execute('s-1');

    expect(sections.deleteById).toHaveBeenCalledWith('s-1');
  });
});
