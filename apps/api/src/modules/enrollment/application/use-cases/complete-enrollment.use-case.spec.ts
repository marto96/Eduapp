import { CompleteEnrollmentUseCase } from './complete-enrollment.use-case';
import { EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { Enrollment } from '../../domain/entities/enrollment.entity';

describe('CompleteEnrollmentUseCase', () => {
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new CompleteEnrollmentUseCase(enrollments);

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si la matrícula no existe', async () => {
    enrollments.findById.mockResolvedValue(null);
    await expect(useCase.execute('e1', true)).rejects.toThrow('No existe la matrícula "e1"');
  });

  it('marca la matrícula completada y aprobada', async () => {
    const enrollment = new Enrollment('e1', 'student-1', 'section-1', 'year-1', 'active');
    enrollments.findById.mockResolvedValue(enrollment);

    const result = await useCase.execute('e1', true);

    expect(result.status).toBe('completed');
    expect(result.passed).toBe(true);
    expect(enrollments.save).toHaveBeenCalledWith(enrollment);
  });

  it('marca la matrícula completada y reprobada', async () => {
    const enrollment = new Enrollment('e1', 'student-1', 'section-1', 'year-1', 'active');
    enrollments.findById.mockResolvedValue(enrollment);

    const result = await useCase.execute('e1', false);

    expect(result.status).toBe('completed');
    expect(result.passed).toBe(false);
  });
});
