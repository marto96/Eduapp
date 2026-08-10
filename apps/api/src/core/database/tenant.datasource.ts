import 'dotenv/config';
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

/**
 * Config base para el schema de cada tenant. Usada por el CLI de TypeORM
 * (generar/correr migraciones) y como base de `TenantConnectionProvider`
 * (que fija `schema` dinámicamente por request vía `search_path`).
 *
 * Lista explícita (no un glob `modules/**`) para no arrastrar por accidente
 * las entidades de `platform`, que vive en el schema `public` y tiene su
 * propio datasource (ver `platform.datasource.ts`). Se agrega una línea acá
 * por cada módulo de negocio nuevo que se implemente.
 */
const TENANT_MODULES = ['identity', 'academic', 'enrollment', 'attendance'];

export const tenantDataSourceOptions: PostgresConnectionOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: TENANT_MODULES.map(
    (mod) => __dirname + `/../../modules/${mod}/infrastructure/entities/*.orm-entity.{ts,js}`,
  ),
  migrations: [__dirname + '/migrations/tenant/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const VALID_SCHEMA_NAME = /^[a-z][a-z0-9_]{2,62}$/;

/**
 * La opción `schema` de TypeORM sólo califica las queries que el ORM mismo
 * genera (entidades, su tabla interna de migraciones); NO fija el
 * `search_path` de la conexión. El SQL crudo de nuestras migraciones y del
 * seed (`CREATE TABLE "users" ...`, sin calificar) se ejecuta contra lo que
 * sea que `search_path` diga en ese momento — por defecto `public`. Por eso
 * hay que fijarlo explícitamente vía `-c search_path=...` al conectar.
 */
export function tenantSchemaOptions(schemaName: string): PostgresConnectionOptions {
  if (!VALID_SCHEMA_NAME.test(schemaName)) {
    throw new Error(`Nombre de schema inválido: "${schemaName}"`);
  }
  return {
    ...tenantDataSourceOptions,
    schema: schemaName,
    extra: { options: `-c search_path=${schemaName},public` },
  };
}

export default new DataSource(tenantDataSourceOptions);
