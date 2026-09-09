import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { BcryptPasswordHasher } from '../../../../core/security/bcrypt-password-hasher';
import { CreateUserUseCase, CreateUserInput } from '../../../identity/application/use-cases/create-user.use-case';
import { User } from '../../../identity/domain/entities/user.entity';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

@Injectable()
export class PlatformCreateTenantUserUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(tenantId: string, input: CreateUserInput, platformAdmin: PlatformJwtPayload): Promise<User> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      const hasher = new BcryptPasswordHasher();
      const user = await new CreateUserUseCase(users, hasher).execute(input);
      await recordPlatformAudit(dataSource, 'create', 'User', user.id, platformAdmin);
      return user;
    });
  }
}
