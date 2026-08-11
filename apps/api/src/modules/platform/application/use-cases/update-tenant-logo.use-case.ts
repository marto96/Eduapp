import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { LogoFile, LogoStoragePort } from '../ports/logo-storage.port';
import { Tenant } from '../../domain/entities/tenant.entity';

@Injectable()
export class UpdateTenantLogoUseCase {
  constructor(
    @Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort,
    @Inject(LogoStoragePort) private readonly storage: LogoStoragePort,
  ) {}

  async execute(id: string, file: LogoFile): Promise<Tenant> {
    const tenant = await this.tenants.findById(id);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${id}"`);
    }

    tenant.logoUrl = await this.storage.save(id, file);
    await this.tenants.save(tenant);
    return tenant;
  }
}
