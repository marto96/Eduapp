import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';
import { TokenIssuerPort } from '../ports/token-issuer.port';

export interface AuthenticateUserInput {
  email: string;
  password: string;
}

export interface AuthenticateUserOutput {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthenticateUserUseCase {
  constructor(
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    @Inject(PasswordHasherPort) private readonly hasher: PasswordHasherPort,
    @Inject(TokenIssuerPort) private readonly tokens: TokenIssuerPort,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<AuthenticateUserOutput> {
    const user = await this.users.findByEmail(input.email);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.isLocked()) {
      throw new UnauthorizedException(
        'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Probá de nuevo en unos minutos.',
      );
    }

    const passwordMatches = await this.hasher.compare(
      input.password,
      user.getPasswordHash(),
    );
    if (!passwordMatches) {
      user.registerFailedLogin();
      await this.users.save(user);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    user.resetLoginAttempts();
    await this.users.save(user);

    return this.tokens.issueTokenPair(user);
  }
}
