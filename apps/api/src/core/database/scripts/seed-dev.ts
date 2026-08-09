import 'reflect-metadata';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import platformDataSource from '../platform.datasource';
import { tenantSchemaOptions } from '../tenant.datasource';
import { createSchemaAndMigrate } from '../schema-provisioner';

const DEMO_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? 'colegio-demo';
const DEMO_SCHEMA = `tenant_${DEMO_SUBDOMAIN.replace(/-/g, '_')}`;
const DEMO_EMAIL = 'admin@colegio-demo.test';
const DEMO_PASSWORD = 'Demo12345!';
const DEMO_TEACHER_EMAIL = 'docente@colegio-demo.test';
const DEMO_TEACHER_PASSWORD = 'Demo12345!';
const SUPERADMIN_EMAIL = 'superadmin@eduapp.test';
const SUPERADMIN_PASSWORD = 'Super12345!';

async function seedTenantUser(
  tenantDataSource: DataSource,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  roles: string[],
) {
  const existingUser = await tenantDataSource.query('SELECT id FROM users WHERE email = $1', [
    email,
  ]);
  if (existingUser.length > 0) {
    console.log(`El usuario "${email}" ya existe, no se recrea.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await tenantDataSource.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, roles, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
    [randomUUID(), email, passwordHash, firstName, lastName, roles],
  );
  console.log(`Usuario creado: ${email} / ${password} (roles: ${roles.join(', ')})`);
}

/**
 * Crea una institución demo con dos usuarios (admin y docente) y un
 * superadmin de plataforma, para poder probar el login y los permisos de
 * punta a punta sin pasar a mano por los endpoints de alta.
 *
 * Uso: pnpm --filter @eduapp/api seed:dev
 */
async function main() {
  await platformDataSource.initialize();

  const existing = await platformDataSource.query(
    'SELECT id FROM tenants WHERE subdomain = $1',
    [DEMO_SUBDOMAIN],
  );

  if (existing.length > 0) {
    console.log(`El tenant "${DEMO_SUBDOMAIN}" ya existe, no se recrea.`);
  } else {
    await createSchemaAndMigrate(platformDataSource, DEMO_SCHEMA);

    await platformDataSource.query(
      `INSERT INTO tenants (id, name, subdomain, schema_name, status, enabled_modules)
       VALUES ($1, $2, $3, $4, 'active', $5)`,
      [randomUUID(), 'Colegio Demo', DEMO_SUBDOMAIN, DEMO_SCHEMA, ['identity', 'academic']],
    );
    console.log(`Tenant "${DEMO_SUBDOMAIN}" creado (schema ${DEMO_SCHEMA}).`);
  }

  const existingSuperadmin = await platformDataSource.query(
    'SELECT id FROM platform_admins WHERE email = $1',
    [SUPERADMIN_EMAIL],
  );
  if (existingSuperadmin.length > 0) {
    console.log(`El superadmin "${SUPERADMIN_EMAIL}" ya existe, no se recrea.`);
  } else {
    const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
    await platformDataSource.query(
      `INSERT INTO platform_admins (id, email, password_hash, full_name, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [randomUUID(), SUPERADMIN_EMAIL, passwordHash, 'Super Admin'],
    );
    console.log(`Superadmin creado: ${SUPERADMIN_EMAIL} / ${SUPERADMIN_PASSWORD}`);
  }

  const tenantDataSource = new DataSource(tenantSchemaOptions(DEMO_SCHEMA));
  await tenantDataSource.initialize();

  try {
    await seedTenantUser(tenantDataSource, DEMO_EMAIL, DEMO_PASSWORD, 'Admin', 'Demo', [
      'admin_institucion',
    ]);
    await seedTenantUser(
      tenantDataSource,
      DEMO_TEACHER_EMAIL,
      DEMO_TEACHER_PASSWORD,
      'Docente',
      'Demo',
      ['docente'],
    );
  } finally {
    await tenantDataSource.destroy();
  }

  await platformDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
