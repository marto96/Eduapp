import { Tenant } from '../../domain/entities/tenant.entity';

export abstract class TenantRepositoryPort {
  abstract findBySubdomain(subdomain: string): Promise<Tenant | null>;
  abstract findByCustomDomain(customDomain: string): Promise<Tenant | null>;
  abstract findAll(): Promise<Tenant[]>;
  abstract existsBySubdomain(subdomain: string): Promise<boolean>;
  abstract save(tenant: Tenant): Promise<void>;
}
