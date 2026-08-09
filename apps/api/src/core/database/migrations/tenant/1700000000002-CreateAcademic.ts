import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Primer módulo de negocio (académico): años lectivos, grados, secciones.
 * Columnas de auditoría estándar por tabla de tenant (ARCHITECTURE.md §5):
 * created_at, updated_at, created_by, deleted_at (soft-delete).
 */
export class CreateAcademic1700000000002 implements MigrationInterface {
  name = 'CreateAcademic1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "academic_years" (
        "id" uuid PRIMARY KEY,
        "name" varchar NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" varchar NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "grades" (
        "id" uuid PRIMARY KEY,
        "name" varchar NOT NULL,
        "level" varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sections" (
        "id" uuid PRIMARY KEY,
        "grade_id" uuid NOT NULL REFERENCES "grades"("id") ON DELETE CASCADE,
        "name" varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sections"`);
    await queryRunner.query(`DROP TABLE "grades"`);
    await queryRunner.query(`DROP TABLE "academic_years"`);
  }
}
