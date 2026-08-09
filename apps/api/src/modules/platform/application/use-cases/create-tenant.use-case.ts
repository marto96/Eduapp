import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { SchemaProvisionerPort } from '../ports/schema-provisioner.port';
import { Tenant } from '../../domain/entities/tenant.entity';

export interface CreateTenantInput {
  name: string;
  subdomain: string;
  customDomain?: string;
  enabledModules?: string[];
}

@Injectable()
export class CreateTenantUseCase {
  constructor(
    @Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort,
    @Inject(SchemaProvisionerPort) private readonly provisioner: SchemaProvisionerPort,
  ) {}

  async execute(input: CreateTenantInput): Promise<Tenant> {
    const alreadyExists = await this.tenants.existsBySubdomain(input.subdomain);
    if (alreadyExists) {
      throw new ConflictException(`Ya existe una institución con subdominio "${input.subdomain}"`);
    }

    const schemaName = `tenant_${input.subdomain.replace(/-/g, '_')}`;

    const tenant = new Tenant(
      randomUUID(),
      input.name,
      input.subdomain,
      input.customDomain ?? null,
      schemaName,
      'active',
      input.enabledModules ?? ['identity', 'academic'],
    );

    // El schema se crea y migra ANTES de registrar el tenant: si algo falla acá,
    // no queda un tenant "fantasma" resoluble sin tablas.
    await this.provisioner.provisionSchema(schemaName);
    await this.tenants.save(tenant);

    return tenant;
  }
}
