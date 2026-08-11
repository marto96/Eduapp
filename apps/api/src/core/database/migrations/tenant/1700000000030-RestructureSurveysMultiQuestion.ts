import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestructureSurveysMultiQuestion1700000000030 implements MigrationInterface {
  name = 'RestructureSurveysMultiQuestion1700000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "surveys"
      DROP COLUMN "question",
      DROP COLUMN "options",
      ADD COLUMN "questions" jsonb NOT NULL DEFAULT '[]',
      ADD COLUMN "closes_at" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "survey_responses"
      DROP COLUMN "selected_option",
      ADD COLUMN "answers" jsonb NOT NULL DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "survey_responses"
      DROP COLUMN "answers",
      ADD COLUMN "selected_option" varchar NOT NULL DEFAULT ''
    `);

    await queryRunner.query(`
      ALTER TABLE "surveys"
      DROP COLUMN "questions",
      DROP COLUMN "closes_at",
      ADD COLUMN "question" varchar NOT NULL DEFAULT '',
      ADD COLUMN "options" text[] NOT NULL DEFAULT '{}'
    `);
  }
}
