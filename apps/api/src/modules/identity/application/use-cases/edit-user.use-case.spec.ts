import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EditUserUseCase } from './edit-user.use-case';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { User } from '../../domain/entities/user.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('EditUserUseCase', () => {
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new EditUserUseCase(users);

  const admin: JwtPayload = { sub: 'admin-1', email: 'admin@test.com', roles: ['admin_institucion'], tenantId: 't-1' };
  const directivo: JwtPayload = { sub: 'dir-1', email: 'dir@test.com', roles: ['directivo'], tenantId: 't-1' };

  const input = {
    email: 'juan.nuevo@test.com',
    firstName: 'Juan',
    lastName: 'Pérez',
    roles: ['estudiante'] as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    users.findByEmail.mockResolvedValue(null);
    users.findByDocumentNumber.mockResolvedValue(null);
  });

  it('rechaza si quien edita no es admin_institucion', async () => {
    await expect(useCase.execute('u-1', input as any, directivo)).rejects.toThrow(ForbiddenException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario no existe', async () => {
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute('u-1', input as any, admin)).rejects.toThrow(NotFoundException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza si el nuevo email ya está en uso por otro usuario', async () => {
    users.findById.mockResolvedValue(
      new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active'),
    );
    users.findByEmail.mockResolvedValue(
      new User('u-2', 'juan.nuevo@test.com', 'hash', 'Otro', 'Usuario', ['estudiante'], 'active'),
    );

    await expect(useCase.execute('u-1', input as any, admin)).rejects.toThrow(ConflictException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza fecha de nacimiento futura', async () => {
    users.findById.mockResolvedValue(
      new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active'),
    );

    await expect(
      useCase.execute('u-1', { ...input, birthDate: '2099-01-01' } as any, admin),
    ).rejects.toThrow(BadRequestException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('edita correctamente cuando el admin provee datos válidos', async () => {
    const existingUser = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Viejo', ['estudiante'], 'active');
    users.findById.mockResolvedValue(existingUser);

    const result = await useCase.execute('u-1', input as any, admin);

    expect(result.email).toBe('juan.nuevo@test.com');
    expect(result.lastName).toBe('Pérez');
    expect(users.save).toHaveBeenCalledTimes(1);
  });

  it('permite guardar el mismo email sin considerarlo duplicado', async () => {
    const existingUser = new User('u-1', 'juan.nuevo@test.com', 'hash', 'Juan', 'Viejo', ['estudiante'], 'active');
    users.findById.mockResolvedValue(existingUser);

    await useCase.execute('u-1', input as any, admin);

    expect(users.findByEmail).not.toHaveBeenCalled();
    expect(users.save).toHaveBeenCalledTimes(1);
  });
});
