import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { buildSyntheticTenantActor } from '../../infrastructure/build-synthetic-tenant-actor';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { ReactivateUserUseCase } from '../../../identity/application/use-cases/reactivate-user.use-case';
import { User } from '../../../identity/domain/entities/user.entity';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

@Injectable()
export class PlatformReactivateTenantUserUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(tenantId: string, userId: string, platformAdmin: PlatformJwtPayload): Promise<User> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      const actor = buildSyntheticTenantActor(platformAdmin, tenant.schemaName);
      const user = await new ReactivateUserUseCase(users).execute(userId, actor);
      await recordPlatformAudit(dataSource, 'reactivate', 'User', user.id, platformAdmin);
      return user;
    });
  }
}
