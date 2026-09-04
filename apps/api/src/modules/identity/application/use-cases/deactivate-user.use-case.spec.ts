import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeactivateUserUseCase } from './deactivate-user.use-case';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { User } from '../../domain/entities/user.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('DeactivateUserUseCase', () => {
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new DeactivateUserUseCase(users);

  const admin: JwtPayload = { sub: 'admin-1', email: 'admin@test.com', roles: ['admin_institucion'], tenantId: 't-1' };
  const directivo: JwtPayload = { sub: 'dir-1', email: 'dir@test.com', roles: ['directivo'], tenantId: 't-1' };

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si quien inactiva no es admin_institucion', async () => {
    await expect(useCase.execute('u-1', directivo)).rejects.toThrow(ForbiddenException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza que el admin se inactive a sí mismo', async () => {
    await expect(useCase.execute('admin-1', admin)).rejects.toThrow(BadRequestException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario no existe', async () => {
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute('u-1', admin)).rejects.toThrow(NotFoundException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('inactiva correctamente', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);

    const result = await useCase.execute('u-1', admin);

    expect(result.status).toBe('suspended');
    expect(users.save).toHaveBeenCalledTimes(1);
  });
});
