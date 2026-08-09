import { Inject, Injectable } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';

@Injectable()
export class ListTenantsUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(): Promise<Tenant[]> {
    return this.tenants.findAll();
  }
}
