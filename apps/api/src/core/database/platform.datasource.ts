import 'dotenv/config';
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

/**
 * Config para el schema `public`: registro global de instituciones. Es la
 * única conexión "fija" del proceso (se registra una vez en AppModule); las
 * conexiones de tenant se abren dinámicamente (ver tenant-connection.provider.ts).
 */
export const platformDataSourceOptions: PostgresConnectionOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: 'public',
  entities: [__dirname + '/../../modules/platform/infrastructure/entities/*.orm-entity.{ts,js}'],
  migrations: [__dirname + '/migrations/public/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

export default new DataSource(platformDataSourceOptions);
