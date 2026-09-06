import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Modelo disperso: por defecto todo grado con precio de "solicitud_admision"
 * configurado para un año con admisiones abiertas acepta solicitudes. Una
 * fila acá significa "este grado, en este año, está cerrado por cupo
 * lleno" — reabrir el grado simplemente borra la fila, en vez de tener que
 * sembrar una fila "abierto" por cada combinación grado×año de antemano.
 */
export class CreateAdmissionGradeClosures1700000000059 implements MigrationInterface {
  name = 'CreateAdmissionGradeClosures1700000000059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admission_grade_closures" (
        "id" uuid PRIMARY KEY,
        "grade_id" uuid NOT NULL REFERENCES "grades"("id") ON DELETE CASCADE,
        "academic_year_id" uuid NOT NULL REFERENCES "academic_years"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_admission_grade_closures_grade_year"
      ON "admission_grade_closures" ("grade_id", "academic_year_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admission_grade_closures"`);
  }
}
