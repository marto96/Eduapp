import { DataSource } from 'typeorm';
import { tenantSchemaOptions } from './tenant.datasource';

const VALID_SCHEMA_NAME = /^[a-z][a-z0-9_]{2,62}$/;

/**
 * Crea (si no existe) el schema de un tenant y corre contra él las
 * migraciones de tenant. Se usa tanto al dar de alta una institución
 * (`CreateTenantUseCase`) como en el runner de migraciones masivas y en el
 * seed de desarrollo — una sola implementación para las tres rutas.
 *
 * `platformDataSource` es la conexión al schema `public` (ya inicializada),
 * usada solo para el `CREATE SCHEMA`; las migraciones corren en una conexión
 * de tenant nueva y efímera, dedicada a ese schema.
 */
export async function createSchemaAndMigrate(
  platformDataSource: DataSource,
  schemaName: string,
): Promise<void> {
  if (!VALID_SCHEMA_NAME.test(schemaName)) {
    throw new Error(`Nombre de schema inválido: "${schemaName}"`);
  }

  await platformDataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

  const tenantDataSource = new DataSource(tenantSchemaOptions(schemaName));
  await tenantDataSource.initialize();
  try {
    await tenantDataSource.runMigrations();
  } finally {
    await tenantDataSource.destroy();
  }
}
