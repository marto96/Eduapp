import { Module } from '@nestjs/common';
import { AuthController } from './interface/controllers/auth.controller';
import { UsersController } from './interface/controllers/users.controller';
import { GuardiansController } from './interface/controllers/guardians.controller';
import { AuthenticateUserUseCase } from './application/use-cases/authenticate-user.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { ResetUserPasswordUseCase } from './application/use-cases/reset-user-password.use-case';
import { LinkGuardianUseCase } from './application/use-cases/link-guardian.use-case';
import { ListGuardianLinksUseCase } from './application/use-cases/list-guardian-links.use-case';
import { RequestGuardianLinkUseCase } from './application/use-cases/request-guardian-link.use-case';
import { ApproveGuardianLinkUseCase } from './application/use-cases/approve-guardian-link.use-case';
import { GuardianAccessService } from './application/services/guardian-access.service';
import { UserRepositoryPort } from './application/ports/user.repository.port';
import { GuardianLinkRepositoryPort } from './application/ports/guardian-link.repository.port';
import { TokenIssuerPort } from './application/ports/token-issuer.port';
import { TypeOrmUserRepository } from './infrastructure/repositories/typeorm-user.repository';
import { TypeOrmGuardianLinkRepository } from './infrastructure/repositories/typeorm-guardian-link.repository';
import { JwtTokenIssuer } from './infrastructure/security/jwt-token-issuer';
import { PasswordHasherPort } from '../../core/security/password-hasher.port';
import { BcryptPasswordHasher } from '../../core/security/bcrypt-password-hasher';

// El repositorio usa TENANT_DATA_SOURCE (provider global de DatabaseModule,
// ver core/database/database.module.ts) en vez de TypeOrmModule.forFeature:
// la conexión de tenant se resuelve por request, no es fija por módulo.

@Module({
  controllers: [AuthController, UsersController, GuardiansController],
  providers: [
    AuthenticateUserUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    GetCurrentUserUseCase,
    CreateUserUseCase,
    ListUsersUseCase,
    ResetUserPasswordUseCase,
    LinkGuardianUseCase,
    ListGuardianLinksUseCase,
    RequestGuardianLinkUseCase,
    ApproveGuardianLinkUseCase,
    GuardianAccessService,
    { provide: UserRepositoryPort, useClass: TypeOrmUserRepository },
    { provide: GuardianLinkRepositoryPort, useClass: TypeOrmGuardianLinkRepository },
    { provide: PasswordHasherPort, useClass: BcryptPasswordHasher },
    { provide: TokenIssuerPort, useClass: JwtTokenIssuer },
  ],
  exports: [UserRepositoryPort, GuardianAccessService],
})
export class IdentityModule {}
