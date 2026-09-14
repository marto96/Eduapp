import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsController } from './interface/controllers/tenants.controller';
import { PlatformAuthController } from './interface/controllers/platform-auth.controller';
import { PlatformTenantUsersController } from './interface/controllers/platform-tenant-users.controller';
import { PlatformTenantAuditController } from './interface/controllers/platform-tenant-audit.controller';
import { PlatformTenantEmailTemplatesController } from './interface/controllers/platform-tenant-email-templates.controller';
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
import { PlatformImpersonateTenantUserUseCase } from './application/use-cases/platform-impersonate-tenant-user.use-case';
import { PlatformListTenantAuditLogsUseCase } from './application/use-cases/platform-list-tenant-audit-logs.use-case';
import { PlatformExportTenantAuditLogsUseCase } from './application/use-cases/platform-export-tenant-audit-logs.use-case';
import { PlatformListTenantEmailTemplatesUseCase } from './application/use-cases/platform-list-tenant-email-templates.use-case';
import { PlatformUpdateTenantEmailTemplateUseCase } from './application/use-cases/platform-update-tenant-email-template.use-case';
import { PlatformSendTenantTestEmailUseCase } from './application/use-cases/platform-send-tenant-test-email.use-case';
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
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([TenantOrmEntity, PlatformAdminOrmEntity], 'platform'), EmailModule],
  controllers: [
    TenantsController,
    PlatformAuthController,
    PlatformTenantUsersController,
    PlatformTenantAuditController,
    PlatformTenantEmailTemplatesController,
  ],
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
    PlatformImpersonateTenantUserUseCase,
    PlatformListTenantAuditLogsUseCase,
    PlatformExportTenantAuditLogsUseCase,
    PlatformListTenantEmailTemplatesUseCase,
    PlatformUpdateTenantEmailTemplateUseCase,
    PlatformSendTenantTestEmailUseCase,
    TotpService,
    { provide: TenantRepositoryPort, useClass: TypeOrmTenantRepository },
    { provide: SchemaProvisionerPort, useClass: SchemaProvisionerAdapter },
    { provide: PlatformAdminRepositoryPort, useClass: TypeOrmPlatformAdminRepository },
    { provide: PasswordHasherPort, useClass: BcryptPasswordHasher },
  ],
  exports: [TenantRepositoryPort],
})
export class PlatformModule {}
