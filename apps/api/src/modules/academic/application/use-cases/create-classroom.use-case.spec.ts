import { CreateClassroomUseCase } from './create-classroom.use-case';
import { ClassroomRepositoryPort } from '../ports/classroom.repository.port';

describe('CreateClassroomUseCase', () => {
  const classrooms: jest.Mocked<ClassroomRepositoryPort> = {
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new CreateClassroomUseCase(classrooms);

  beforeEach(() => jest.clearAllMocks());

  it('crea y guarda un aula', async () => {
    const result = await useCase.execute({ name: 'Aula 201', capacity: 30 });
    expect(result.name).toBe('Aula 201');
    expect(result.capacity).toBe(30);
    expect(classrooms.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Aula 201', capacity: 30 }));
  });

  it('propaga el error de capacidad inválida de la entidad', async () => {
    await expect(useCase.execute({ name: 'Aula 201', capacity: 0 })).rejects.toThrow(
      'La capacidad debe ser mayor a cero',
    );
    expect(classrooms.save).not.toHaveBeenCalled();
  });
});
