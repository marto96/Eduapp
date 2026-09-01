import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lista de precios por grado+año lectivo+concepto — usada solo para
 * precargar el monto en "Crear cargo" (no lo bloquea, sigue siendo
 * editable ahí). El índice único evita cargar dos precios distintos para
 * la misma combinación grado/año/concepto.
 */
export class CreateFeeSchedules1700000000045 implements MigrationInterface {
  name = 'CreateFeeSchedules1700000000045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "fee_schedules" (
        "id" uuid PRIMARY KEY,
        "grade_id" uuid NOT NULL REFERENCES "grades"("id") ON DELETE CASCADE,
        "academic_year_id" uuid NOT NULL REFERENCES "academic_years"("id") ON DELETE CASCADE,
        "concept" varchar NOT NULL,
        "amount" real NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_fee_schedules_grade_year_concept"
      ON "fee_schedules" ("grade_id", "academic_year_id", "concept")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "fee_schedules"`);
  }
}
