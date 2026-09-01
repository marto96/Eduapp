import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateUserUseCase } from './create-user.use-case';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';
import { User } from '../../domain/entities/user.entity';

describe('CreateUserUseCase', () => {
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const hasher: jest.Mocked<PasswordHasherPort> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const useCase = new CreateUserUseCase(users, hasher);

  beforeEach(() => {
    jest.clearAllMocks();
    users.findByEmail.mockResolvedValue(null);
    users.findByDocumentNumber.mockResolvedValue(null);
    hasher.hash.mockResolvedValue('hashed');
  });

  it('rechaza si ya existe un usuario con ese email', async () => {
    users.findByEmail.mockResolvedValue(
      new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active'),
    );

    await expect(
      useCase.execute({
        email: 'juan@test.com',
        password: 'password123',
        firstName: 'Juan',
        lastName: 'Pérez',
        roles: ['estudiante'],
      }),
    ).rejects.toThrow(ConflictException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza si ya existe un usuario con ese número de documento', async () => {
    users.findByDocumentNumber.mockResolvedValue(
      new User(
        'u-1',
        'existente@test.com',
        'hash',
        'Otro',
        'Estudiante',
        ['estudiante'],
        'active',
        0,
        null,
        null,
        'TI',
        '1234567890',
        null,
      ),
    );

    await expect(
      useCase.execute({
        email: 'juan@test.com',
        password: 'password123',
        firstName: 'Juan',
        lastName: 'Pérez',
        roles: ['estudiante'],
        documentType: 'TI',
        documentNumber: '1234567890',
      }),
    ).rejects.toThrow(ConflictException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza fecha de nacimiento futura', async () => {
    await expect(
      useCase.execute({
        email: 'juan@test.com',
        password: 'password123',
        firstName: 'Juan',
        lastName: 'Pérez',
        roles: ['estudiante'],
        birthDate: '2099-01-01',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('crea el usuario con los datos personales cuando se proveen', async () => {
    const user = await useCase.execute({
      email: 'juan@test.com',
      password: 'password123',
      firstName: 'Juan',
      lastName: 'Pérez',
      roles: ['estudiante'],
      birthDate: '2015-05-20',
      documentType: 'TI',
      documentNumber: '1234567890',
      address: 'Calle 10 # 20-30',
    });

    expect(user.birthDate).toBe('2015-05-20');
    expect(user.documentType).toBe('TI');
    expect(user.documentNumber).toBe('1234567890');
    expect(user.address).toBe('Calle 10 # 20-30');
    expect(users.save).toHaveBeenCalledTimes(1);
  });

  it('crea el usuario sin datos personales (docente/secretaria, campos opcionales)', async () => {
    const user = await useCase.execute({
      email: 'docente@test.com',
      password: 'password123',
      firstName: 'Ana',
      lastName: 'Gómez',
      roles: ['docente'],
    });

    expect(user.birthDate).toBeNull();
    expect(user.documentType).toBeNull();
    expect(user.documentNumber).toBeNull();
    expect(user.address).toBeNull();
  });
});
