import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsController } from './interface/controllers/tenants.controller';
import { PlatformAuthController } from './interface/controllers/platform-auth.controller';
import { PlatformTenantUsersController } from './interface/controllers/platform-tenant-users.controller';
import { PlatformAdminGuard } from './interface/guards/platform-admin.guard';
import { CreateTenantUseCase } from './application/use-cases/create-tenant.use-case';
import { ListTenantsUseCase } from './application/use-cases/list-tenants.use-case';
import { GetTenantUseCase } from './application/use-cases/get-tenant.use-case';
import { UpdateTenantUseCase } from './application/use-cases/update-tenant.use-case';
import { UpdateTenantLogoUseCase } from './application/use-cases/update-tenant-logo.use-case';
import { AuthenticatePlatformAdminUseCase } from './application/use-cases/authenticate-platform-admin.use-case';
import { SetupPlatformAdminTotpUseCase } from './application/use-cases/setup-platform-admin-totp.use-case';
import { ConfirmPlatformAdminTotpUseCase } from './application/use-cases/confirm-platform-admin-totp.use-case';
import { VerifyPlatformAdminTotpUseCase } from './application/use-cases/verify-platform-admin-totp.use-case';
import { PlatformCreateTenantUserUseCase } from './application/use-cases/platform-create-tenant-user.use-case';
import { PlatformListTenantUsersUseCase } from './application/use-cases/platform-list-tenant-users.use-case';
import { PlatformEditTenantUserUseCase } from './application/use-cases/platform-edit-tenant-user.use-case';
import { PlatformDeactivateTenantUserUseCase } from './application/use-cases/platform-deactivate-tenant-user.use-case';
import { PlatformReactivateTenantUserUseCase } from './application/use-cases/platform-reactivate-tenant-user.use-case';
import { PlatformResetTenantUserPasswordUseCase } from './application/use-cases/platform-reset-tenant-user-password.use-case';
import { TotpService } from './infrastructure/totp.service';
import { TenantRepositoryPort } from './application/ports/tenant.repository.port';
import { SchemaProvisionerPort } from './application/ports/schema-provisioner.port';
import { PlatformAdminRepositoryPort } from './application/ports/platform-admin.repository.port';
import { TypeOrmTenantRepository } from './infrastructure/repositories/typeorm-tenant.repository';
import { SchemaProvisionerAdapter } from './infrastructure/schema-provisioner.adapter';
import { TypeOrmPlatformAdminRepository } from './infrastructure/repositories/typeorm-platform-admin.repository';
import { TenantOrmEntity } from './infrastructure/entities/tenant.orm-entity';
import { PlatformAdminOrmEntity } from './infrastructure/entities/platform-admin.orm-entity';
import { PasswordHasherPort } from '../../core/security/password-hasher.port';
import { BcryptPasswordHasher } from '../../core/security/bcrypt-password-hasher';

@Module({
  imports: [TypeOrmModule.forFeature([TenantOrmEntity, PlatformAdminOrmEntity], 'platform')],
  controllers: [TenantsController, PlatformAuthController, PlatformTenantUsersController],
  providers: [
    PlatformAdminGuard,
    CreateTenantUseCase,
    ListTenantsUseCase,
    GetTenantUseCase,
    UpdateTenantUseCase,
    UpdateTenantLogoUseCase,
    AuthenticatePlatformAdminUseCase,
    SetupPlatformAdminTotpUseCase,
    ConfirmPlatformAdminTotpUseCase,
    VerifyPlatformAdminTotpUseCase,
    PlatformCreateTenantUserUseCase,
    PlatformListTenantUsersUseCase,
    PlatformEditTenantUserUseCase,
    PlatformDeactivateTenantUserUseCase,
    PlatformReactivateTenantUserUseCase,
    PlatformResetTenantUserPasswordUseCase,
    TotpService,
    { provide: TenantRepositoryPort, useClass: TypeOrmTenantRepository },
    { provide: SchemaProvisionerPort, useClass: SchemaProvisionerAdapter },
    { provide: PlatformAdminRepositoryPort, useClass: TypeOrmPlatformAdminRepository },
    { provide: PasswordHasherPort, useClass: BcryptPasswordHasher },
  ],
  exports: [TenantRepositoryPort],
})
export class PlatformModule {}
