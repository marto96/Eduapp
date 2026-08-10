import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El índice único parcial refuerza a nivel de base la regla de "una
 * matrícula activa por estudiante y año lectivo" (ya validada en
 * `EnrollStudentUseCase`) — evita duplicados por condiciones de carrera
 * entre dos requests concurrentes.
 */
export class CreateEnrollments1700000000004 implements MigrationInterface {
  name = 'CreateEnrollments1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "enrollments" (
        "id" uuid PRIMARY KEY,
        "student_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "section_id" uuid NOT NULL REFERENCES "sections"("id") ON DELETE CASCADE,
        "academic_year_id" uuid NOT NULL REFERENCES "academic_years"("id") ON DELETE CASCADE,
        "status" varchar NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_enrollments_active_student_year"
      ON "enrollments" ("student_id", "academic_year_id")
      WHERE "status" = 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "enrollments"`);
  }
}
