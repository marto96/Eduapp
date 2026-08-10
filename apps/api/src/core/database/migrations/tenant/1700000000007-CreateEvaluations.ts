import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEvaluations1700000000007 implements MigrationInterface {
  name = 'CreateEvaluations1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "evaluations" (
        "id" uuid PRIMARY KEY,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
        "section_id" uuid NOT NULL REFERENCES "sections"("id") ON DELETE CASCADE,
        "academic_year_id" uuid NOT NULL REFERENCES "academic_years"("id") ON DELETE CASCADE,
        "period" varchar NOT NULL,
        "type" varchar NOT NULL,
        "max_score" real NOT NULL DEFAULT 10,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "evaluations"`);
  }
}
