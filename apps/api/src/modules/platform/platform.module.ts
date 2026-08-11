import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsController } from './interface/controllers/tenants.controller';
import { PlatformAuthController } from './interface/controllers/platform-auth.controller';
import { PlatformAdminGuard } from './interface/guards/platform-admin.guard';
import { CreateTenantUseCase } from './application/use-cases/create-tenant.use-case';
import { ListTenantsUseCase } from './application/use-cases/list-tenants.use-case';
import { UpdateTenantUseCase } from './application/use-cases/update-tenant.use-case';
import { AuthenticatePlatformAdminUseCase } from './application/use-cases/authenticate-platform-admin.use-case';
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
  controllers: [TenantsController, PlatformAuthController],
  providers: [
    PlatformAdminGuard,
    CreateTenantUseCase,
    ListTenantsUseCase,
    UpdateTenantUseCase,
    AuthenticatePlatformAdminUseCase,
    { provide: TenantRepositoryPort, useClass: TypeOrmTenantRepository },
    { provide: SchemaProvisionerPort, useClass: SchemaProvisionerAdapter },
    { provide: PlatformAdminRepositoryPort, useClass: TypeOrmPlatformAdminRepository },
    { provide: PasswordHasherPort, useClass: BcryptPasswordHasher },
  ],
  exports: [TenantRepositoryPort],
})
export class PlatformModule {}
