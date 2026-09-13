import { ListClassroomsUseCase } from './list-classrooms.use-case';
import { ClassroomRepositoryPort } from '../ports/classroom.repository.port';
import { Classroom } from '../../domain/entities/classroom.entity';

describe('ListClassroomsUseCase', () => {
  const classrooms: jest.Mocked<ClassroomRepositoryPort> = {
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new ListClassroomsUseCase(classrooms);

  beforeEach(() => jest.clearAllMocks());

  it('devuelve todas las aulas del repositorio', async () => {
    classrooms.findAll.mockResolvedValue([new Classroom('c-1', 'Aula 201', 30)]);
    const result = await useCase.execute();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Aula 201');
  });
});
