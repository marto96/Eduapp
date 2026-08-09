import 'reflect-metadata';
import platformDataSource from '../platform.datasource';
import { createSchemaAndMigrate } from '../schema-provisioner';

/**
 * Corre las migraciones pendientes contra el schema `public` y luego contra
 * el schema de cada tenant registrado. Pensado para correr en CI/CD después
 * de cada deploy.
 *
 * Uso: pnpm --filter @eduapp/api migration:run:tenant:all
 */
async function main() {
  await platformDataSource.initialize();

  console.log('Corriendo migraciones de public...');
  await platformDataSource.runMigrations();

  const tenants: { schema_name: string }[] = await platformDataSource.query(
    'SELECT schema_name FROM tenants',
  );

  for (const { schema_name: schemaName } of tenants) {
    console.log(`Corriendo migraciones de tenant "${schemaName}"...`);
    await createSchemaAndMigrate(platformDataSource, schemaName);
  }

  await platformDataSource.destroy();
  console.log(`Listo: public + ${tenants.length} tenant(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
