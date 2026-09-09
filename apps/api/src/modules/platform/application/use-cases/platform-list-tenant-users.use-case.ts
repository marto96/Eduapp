import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { ListUsersUseCase } from '../../../identity/application/use-cases/list-users.use-case';
import { User, UserRole } from '../../../identity/domain/entities/user.entity';
import { PaginatedResult } from '../../../../core/http/pagination.dto';

@Injectable()
export class PlatformListTenantUsersUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(
    tenantId: string,
    role?: UserRole,
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<User[] | PaginatedResult<User>> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      return new ListUsersUseCase(users).execute(role, page, pageSize, search);
    });
  }
}
