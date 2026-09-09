import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { buildSyntheticTenantActor } from '../../infrastructure/build-synthetic-tenant-actor';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { EditUserUseCase, EditUserInput } from '../../../identity/application/use-cases/edit-user.use-case';
import { User } from '../../../identity/domain/entities/user.entity';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

@Injectable()
export class PlatformEditTenantUserUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(
    tenantId: string,
    userId: string,
    input: EditUserInput,
    platformAdmin: PlatformJwtPayload,
  ): Promise<User> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      const actor = buildSyntheticTenantActor(platformAdmin, tenant.schemaName);
      const user = await new EditUserUseCase(users).execute(userId, input, actor);
      await recordPlatformAudit(dataSource, 'edit', 'User', user.id, platformAdmin);
      return user;
    });
  }
}
