import { UnauthorizedException } from '@nestjs/common';
import { AuthenticateUserUseCase } from './authenticate-user.use-case';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';
import { TokenIssuerPort } from '../ports/token-issuer.port';
import { User } from '../../domain/entities/user.entity';

describe('AuthenticateUserUseCase', () => {
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const hasher: jest.Mocked<PasswordHasherPort> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const tokens: jest.Mocked<TokenIssuerPort> = {
    issueTokenPair: jest.fn(),
  };

  const useCase = new AuthenticateUserUseCase(users, hasher, tokens);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si el usuario no existe', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute({ email: 'x@x.com', password: 'x' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza si el usuario no está activo', async () => {
    const user = new User('1', 'x@x.com', 'hash', 'A', 'B', ['docente'], 'suspended');
    users.findByEmail.mockResolvedValue(user);

    await expect(useCase.execute({ email: 'x@x.com', password: 'x' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza si la contraseña no coincide', async () => {
    const user = new User('1', 'x@x.com', 'hash', 'A', 'B', ['docente'], 'active');
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(false);

    await expect(useCase.execute({ email: 'x@x.com', password: 'bad' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('devuelve los tokens cuando las credenciales son válidas', async () => {
    const user = new User('1', 'x@x.com', 'hash', 'A', 'B', ['docente'], 'active');
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);
    tokens.issueTokenPair.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });

    const result = await useCase.execute({ email: 'x@x.com', password: 'good' });

    expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    expect(tokens.issueTokenPair).toHaveBeenCalledWith(user);
  });
});
