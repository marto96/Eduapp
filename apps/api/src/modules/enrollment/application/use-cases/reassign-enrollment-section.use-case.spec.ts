import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReassignEnrollmentSectionUseCase } from './reassign-enrollment-section.use-case';
import { EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { SectionRepositoryPort } from '../../../academic/application/ports/section.repository.port';
import { Enrollment } from '../../domain/entities/enrollment.entity';
import { Section } from '../../../academic/domain/entities/section.entity';

describe('ReassignEnrollmentSectionUseCase', () => {
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
  const sections: jest.Mocked<SectionRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
    hasEnrollments: jest.fn(),
  };

  const useCase = new ReassignEnrollmentSectionUseCase(enrollments, sections);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si la matrícula no existe', async () => {
    enrollments.findById.mockResolvedValue(null);

    await expect(useCase.execute('e-1', 'sec-2')).rejects.toThrow(NotFoundException);
    expect(enrollments.save).not.toHaveBeenCalled();
  });

  it('rechaza si la matrícula no está activa', async () => {
    enrollments.findById.mockResolvedValue(
      new Enrollment('e-1', 'stu-1', 'sec-1', 'year-1', 'withdrawn'),
    );

    await expect(useCase.execute('e-1', 'sec-2')).rejects.toThrow(BadRequestException);
    expect(enrollments.save).not.toHaveBeenCalled();
  });

  it('rechaza si la nueva sección no existe', async () => {
    enrollments.findById.mockResolvedValue(new Enrollment('e-1', 'stu-1', 'sec-1', 'year-1', 'active'));
    sections.findById.mockImplementation(async (id) => (id === 'sec-1' ? new Section('sec-1', 'grade-1', 'A') : null));

    await expect(useCase.execute('e-1', 'sec-2')).rejects.toThrow(NotFoundException);
    expect(enrollments.save).not.toHaveBeenCalled();
  });

  it('rechaza si la nueva sección es de otro grado', async () => {
    enrollments.findById.mockResolvedValue(new Enrollment('e-1', 'stu-1', 'sec-1', 'year-1', 'active'));
    sections.findById.mockImplementation(async (id) => {
      if (id === 'sec-1') return new Section('sec-1', 'grade-1', 'A');
      if (id === 'sec-2') return new Section('sec-2', 'grade-2', 'B');
      return null;
    });

    await expect(useCase.execute('e-1', 'sec-2')).rejects.toThrow(BadRequestException);
    expect(enrollments.save).not.toHaveBeenCalled();
  });

  it('reubica correctamente a una sección del mismo grado', async () => {
    const enrollment = new Enrollment('e-1', 'stu-1', 'sec-1', 'year-1', 'active');
    enrollments.findById.mockResolvedValue(enrollment);
    sections.findById.mockImplementation(async (id) => {
      if (id === 'sec-1') return new Section('sec-1', 'grade-1', 'A');
      if (id === 'sec-2') return new Section('sec-2', 'grade-1', 'B');
      return null;
    });

    const result = await useCase.execute('e-1', 'sec-2');

    expect(result.sectionId).toBe('sec-2');
    expect(enrollments.save).toHaveBeenCalledTimes(1);
  });
});
