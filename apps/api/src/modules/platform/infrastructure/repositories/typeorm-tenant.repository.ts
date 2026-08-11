import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantRepositoryPort } from '../../application/ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { TenantOrmEntity } from '../entities/tenant.orm-entity';

/**
 * A diferencia de los repositorios de módulos de negocio (identity, academic),
 * este usa la conexión fija `platform` (@InjectRepository con conexión
 * nombrada), no `TENANT_DATA_SOURCE`: `tenants` vive en `public`, el mismo
 * schema para todas las instituciones.
 */
@Injectable()
export class TypeOrmTenantRepository extends TenantRepositoryPort {
  constructor(
    @InjectRepository(TenantOrmEntity, 'platform')
    private readonly repo: Repository<TenantOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<Tenant | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    const row = await this.repo.findOne({ where: { subdomain } });
    return row ? this.toDomain(row) : null;
  }

  async findByCustomDomain(customDomain: string): Promise<Tenant | null> {
    const row = await this.repo.findOne({ where: { customDomain } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Tenant[]> {
    const rows = await this.repo.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toDomain(row));
  }

  async existsBySubdomain(subdomain: string): Promise<boolean> {
    const count = await this.repo.count({ where: { subdomain } });
    return count > 0;
  }

  async save(tenant: Tenant): Promise<void> {
    await this.repo.save({
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      schemaName: tenant.schemaName,
      status: tenant.status,
      enabledModules: tenant.enabledModules,
      primaryColor: tenant.primaryColor,
    });
  }

  private toDomain(row: TenantOrmEntity): Tenant {
    return new Tenant(
      row.id,
      row.name,
      row.subdomain,
      row.customDomain,
      row.schemaName,
      row.status,
      row.enabledModules,
      row.primaryColor,
    );
  }
}
