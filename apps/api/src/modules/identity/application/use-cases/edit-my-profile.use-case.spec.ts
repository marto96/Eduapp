import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EditMyProfileUseCase } from './edit-my-profile.use-case';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { User } from '../../domain/entities/user.entity';

describe('EditMyProfileUseCase', () => {
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new EditMyProfileUseCase(users);

  const input = { firstName: 'Juana', lastName: 'Pérez' };

  beforeEach(() => {
    jest.clearAllMocks();
    users.findByDocumentNumber.mockResolvedValue(null);
  });

  it('rechaza si el usuario no existe', async () => {
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute('u-1', input)).rejects.toThrow(NotFoundException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('edita nombre y apellido', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);

    const result = await useCase.execute('u-1', input);

    expect(result.firstName).toBe('Juana');
    expect(users.save).toHaveBeenCalledWith(user);
  });

  it('nunca toca email ni roles, aunque el input los tuviera', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);

    const result = await useCase.execute('u-1', { ...input, email: 'otro@test.com', roles: ['admin_institucion'] } as any);

    expect(result.email).toBe('juan@test.com');
    expect(result.roles).toEqual(['estudiante']);
  });

  it('rechaza si el número de documento ya está en uso por otro usuario', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);
    users.findByDocumentNumber.mockResolvedValue(
      new User('u-2', 'otro@test.com', 'hash', 'Otro', 'Usuario', ['estudiante'], 'active'),
    );

    await expect(useCase.execute('u-1', { ...input, documentNumber: '123' })).rejects.toThrow(ConflictException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('permite guardar el propio número de documento sin cambios', async () => {
    const user = new User(
      'u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active',
      0, null, null, null, '123',
    );
    users.findById.mockResolvedValue(user);
    users.findByDocumentNumber.mockResolvedValue(user);

    const result = await useCase.execute('u-1', { ...input, documentNumber: '123' });

    expect(result.documentNumber).toBe('123');
    expect(users.save).toHaveBeenCalled();
  });

  it('rechaza fecha de nacimiento futura', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);

    await expect(
      useCase.execute('u-1', { ...input, birthDate: '2999-01-01' }),
    ).rejects.toThrow(BadRequestException);
    expect(users.save).not.toHaveBeenCalled();
  });
});
