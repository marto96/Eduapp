import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmployees1700000000012 implements MigrationInterface {
  name = 'CreateEmployees1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "position" varchar NOT NULL,
        "contract_type" varchar NOT NULL,
        "hire_date" date NOT NULL,
        "status" varchar NOT NULL DEFAULT 'activo',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "employees"`);
  }
}
