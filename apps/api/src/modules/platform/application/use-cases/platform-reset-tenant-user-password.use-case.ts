import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { BcryptPasswordHasher } from '../../../../core/security/bcrypt-password-hasher';
import {
  ResetUserPasswordUseCase,
  ResetUserPasswordOutput,
} from '../../../identity/application/use-cases/reset-user-password.use-case';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

@Injectable()
export class PlatformResetTenantUserPasswordUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(
    tenantId: string,
    userId: string,
    platformAdmin: PlatformJwtPayload,
  ): Promise<ResetUserPasswordOutput> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      const hasher = new BcryptPasswordHasher();
      const result = await new ResetUserPasswordUseCase(users, hasher).execute(userId);
      await recordPlatformAudit(dataSource, 'reset-password', 'User', userId, platformAdmin);
      return result;
    });
  }
}
