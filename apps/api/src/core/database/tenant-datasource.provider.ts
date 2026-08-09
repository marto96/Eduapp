import { Provider, Scope } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantConnectionProvider } from './tenant-connection.provider';
import { getCurrentTenant } from '../tenant/tenant-context';

/**
 * Token de inyección para la conexión TypeORM del tenant actual. Reemplaza
 * a `@InjectRepository`, que usa una única conexión global de Nest y por lo
 * tanto no puede variar el `search_path` por request.
 */
export const TENANT_DATA_SOURCE = Symbol('TENANT_DATA_SOURCE');

/**
 * Provider `Scope.REQUEST`: se resuelve una vez por request, después de que
 * `TenantResolutionMiddleware` publicó el tenant en `AsyncLocalStorage`.
 * Reutiliza el pool con expiración LRU de `TenantConnectionProvider`, así
 * que no abre una conexión nueva por request.
 */
export const tenantDataSourceProvider: Provider = {
  provide: TENANT_DATA_SOURCE,
  scope: Scope.REQUEST,
  inject: [TenantConnectionProvider],
  useFactory: async (connections: TenantConnectionProvider): Promise<DataSource> => {
    const { schemaName } = getCurrentTenant();
    return connections.getConnectionForSchema(schemaName);
  },
};
