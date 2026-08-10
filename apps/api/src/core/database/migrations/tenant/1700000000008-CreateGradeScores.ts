import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El índice único en (evaluation_id, enrollment_id) es el conflict target
 * del `ON CONFLICT ... DO UPDATE` que usa `TypeOrmGradeScoreRepository.upsertMany`
 * — mismo criterio que `attendance_records`.
 */
export class CreateGradeScores1700000000008 implements MigrationInterface {
  name = 'CreateGradeScores1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "grade_scores" (
        "id" uuid PRIMARY KEY,
        "evaluation_id" uuid NOT NULL REFERENCES "evaluations"("id") ON DELETE CASCADE,
        "enrollment_id" uuid NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
        "score" real NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_grade_scores_evaluation_enrollment"
      ON "grade_scores" ("evaluation_id", "enrollment_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "grade_scores"`);
  }
}
