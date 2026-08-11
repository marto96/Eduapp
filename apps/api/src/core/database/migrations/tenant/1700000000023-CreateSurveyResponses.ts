import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSurveyResponses1700000000023 implements MigrationInterface {
  name = 'CreateSurveyResponses1700000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "survey_responses" (
        "id" uuid PRIMARY KEY,
        "survey_id" uuid NOT NULL REFERENCES "surveys"("id") ON DELETE CASCADE,
        "respondent_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "selected_option" varchar NOT NULL,
        "responded_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_survey_responses_survey_respondent"
      ON "survey_responses" ("survey_id", "respondent_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "survey_responses"`);
  }
}
