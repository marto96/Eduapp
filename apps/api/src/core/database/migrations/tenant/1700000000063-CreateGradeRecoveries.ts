import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Una sola recuperación vigente por (enrollment, subject, period) — registrar
 * de nuevo actualiza la existente en vez de crear un duplicado (upsert por
 * el índice único, ver `TypeOrmGradeRecoveryRepository`). No guarda quién
 * la cargó — eso queda en `audit_logs`, igual que `grade_scores`.
 */
export class CreateGradeRecoveries1700000000063 implements MigrationInterface {
  name = 'CreateGradeRecoveries1700000000063';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "grade_recoveries" (
        "id" uuid PRIMARY KEY,
        "enrollment_id" uuid NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
        "period_id" uuid NOT NULL REFERENCES "periods"("id") ON DELETE CASCADE,
        "score" real NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_grade_recoveries_unique_key"
      ON "grade_recoveries" ("enrollment_id", "subject_id", "period_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "grade_recoveries"`);
  }
}
