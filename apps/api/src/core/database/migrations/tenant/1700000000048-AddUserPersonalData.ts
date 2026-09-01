import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Datos personales opcionales de usuario (fecha de nacimiento, documento de
 * identidad, dirección) — requeridos por el formulario de matrícula de
 * estudiante nuevo, pero nullable a nivel de columna porque `users` es
 * compartida por todos los roles (docente/secretaria/etc. no los cargan).
 */
export class AddUserPersonalData1700000000048 implements MigrationInterface {
  name = 'AddUserPersonalData1700000000048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "birth_date" date,
      ADD COLUMN "document_type" varchar,
      ADD COLUMN "document_number" varchar,
      ADD COLUMN "address" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "birth_date",
      DROP COLUMN "document_type",
      DROP COLUMN "document_number",
      DROP COLUMN "address"
    `);
  }
}
