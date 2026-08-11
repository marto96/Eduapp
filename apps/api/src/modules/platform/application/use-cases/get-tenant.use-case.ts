import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';

@Injectable()
export class GetTenantUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(id: string): Promise<Tenant> {
    const tenant = await this.tenants.findById(id);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${id}"`);
    }
    return tenant;
  }
}
