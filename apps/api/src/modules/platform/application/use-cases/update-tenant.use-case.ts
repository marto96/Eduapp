import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';

export interface UpdateTenantInput {
  name?: string;
  customDomain?: string;
  enabledModules?: string[];
  primaryColor?: string;
}

@Injectable()
export class UpdateTenantUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(id: string, input: UpdateTenantInput): Promise<Tenant> {
    const tenant = await this.tenants.findById(id);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${id}"`);
    }

    if (input.name !== undefined) tenant.name = input.name;
    if (input.customDomain !== undefined) tenant.customDomain = input.customDomain;
    if (input.enabledModules !== undefined) tenant.enabledModules = input.enabledModules;
    if (input.primaryColor !== undefined) tenant.primaryColor = input.primaryColor;

    await this.tenants.save(tenant);
    return tenant;
  }
}
