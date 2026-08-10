import { Module } from '@nestjs/common';
import { AuthController } from './interface/controllers/auth.controller';
import { UsersController } from './interface/controllers/users.controller';
import { AuthenticateUserUseCase } from './application/use-cases/authenticate-user.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UserRepositoryPort } from './application/ports/user.repository.port';
import { TokenIssuerPort } from './application/ports/token-issuer.port';
import { TypeOrmUserRepository } from './infrastructure/repositories/typeorm-user.repository';
import { JwtTokenIssuer } from './infrastructure/security/jwt-token-issuer';
import { PasswordHasherPort } from '../../core/security/password-hasher.port';
import { BcryptPasswordHasher } from '../../core/security/bcrypt-password-hasher';

// El repositorio usa TENANT_DATA_SOURCE (provider global de DatabaseModule,
// ver core/database/database.module.ts) en vez de TypeOrmModule.forFeature:
// la conexión de tenant se resuelve por request, no es fija por módulo.

@Module({
  controllers: [AuthController, UsersController],
  providers: [
    AuthenticateUserUseCase,
    RefreshTokenUseCase,
    GetCurrentUserUseCase,
    CreateUserUseCase,
    ListUsersUseCase,
    { provide: UserRepositoryPort, useClass: TypeOrmUserRepository },
    { provide: PasswordHasherPort, useClass: BcryptPasswordHasher },
    { provide: TokenIssuerPort, useClass: JwtTokenIssuer },
  ],
  exports: [UserRepositoryPort],
})
export class IdentityModule {}
