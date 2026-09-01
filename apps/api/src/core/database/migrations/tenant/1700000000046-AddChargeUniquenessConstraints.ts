import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 'enrollments' ya está limitado a un año lectivo por matrícula
 * (IDX_enrollments_active_student_year), así que "una matrícula por
 * enrollment_id" y "una pensión por mes por enrollment_id" ya equivalen
 * a "por año lectivo" — no hace falta cargar academic_year_id en charges.
 */
export class AddChargeUniquenessConstraints1700000000046 implements MigrationInterface {
  name = 'AddChargeUniquenessConstraints1700000000046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_charges_unique_matricula_per_enrollment"
      ON "charges" ("enrollment_id")
      WHERE "concept" = 'matricula' AND "voided_at" IS NULL
    `);

    // `date_trunc('month', due_date)` sin cast resuelve a la sobrecarga
    // timestamptz (STABLE, depende de timezone) en vez de la timestamp
    // (IMMUTABLE) — Postgres rechaza índices con funciones no-IMMUTABLE.
    // El cast explícito a timestamp fuerza la sobrecarga correcta.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_charges_unique_pension_per_month"
      ON "charges" ("enrollment_id", date_trunc('month', "due_date"::timestamp))
      WHERE "concept" = 'pension' AND "voided_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_charges_unique_pension_per_month"`);
    await queryRunner.query(`DROP INDEX "IDX_charges_unique_matricula_per_enrollment"`);
  }
}
