import { Global, Module } from '@nestjs/common';
import { TenantConnectionProvider } from './tenant-connection.provider';
import { tenantDataSourceProvider } from './tenant-datasource.provider';

/**
 * Expone `TENANT_DATA_SOURCE` (conexión con `search_path` del tenant actual)
 * a cualquier módulo de negocio. Los repositorios inyectan ese token en vez
 * de usar `@InjectRepository`, que no soporta variar el schema por request.
 */
@Global()
@Module({
  providers: [TenantConnectionProvider, tenantDataSourceProvider],
  exports: [tenantDataSourceProvider],
})
export class DatabaseModule {}
