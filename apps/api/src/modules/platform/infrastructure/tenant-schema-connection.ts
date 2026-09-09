import { DataSource } from 'typeorm';
import { tenantSchemaOptions } from '../../../core/database/tenant.datasource';

/**
 * Abre una conexión puntual al schema de un tenant elegido por el
 * superadmin — mismo mecanismo que `SchemaProvisionerAdapter` usa para
 * migrar, generalizado para abrir/cerrar una conexión por acción en vez
 * de por migración. Nunca usa `TENANT_DATA_SOURCE` (esa resuelve el
 * tenant por el subdominio de la request actual, que en una request de
 * `/platform` no es el tenant que se quiere gestionar).
 */
export async function withTenantSchemaConnection<T>(
  schemaName: string,
  fn: (dataSource: DataSource) => Promise<T>,
): Promise<T> {
  const dataSource = new DataSource(tenantSchemaOptions(schemaName));
  await dataSource.initialize();
  try {
    return await fn(dataSource);
  } finally {
    await dataSource.destroy();
  }
}
