import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEvents1700000000019 implements MigrationInterface {
  name = 'CreateEvents1700000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid PRIMARY KEY,
        "title" varchar NOT NULL,
        "description" text NOT NULL,
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz,
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "events"`);
  }
}
