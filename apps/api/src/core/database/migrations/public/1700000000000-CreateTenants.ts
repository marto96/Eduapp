import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenants1700000000000 implements MigrationInterface {
  name = 'CreateTenants1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid PRIMARY KEY,
        "name" varchar NOT NULL,
        "subdomain" varchar NOT NULL UNIQUE,
        "custom_domain" varchar UNIQUE,
        "schema_name" varchar NOT NULL UNIQUE,
        "status" varchar NOT NULL DEFAULT 'active',
        "enabled_modules" text[] NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}
