import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSurveys1700000000022 implements MigrationInterface {
  name = 'CreateSurveys1700000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "surveys" (
        "id" uuid PRIMARY KEY,
        "question" varchar NOT NULL,
        "options" text[] NOT NULL,
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "surveys"`);
  }
}
