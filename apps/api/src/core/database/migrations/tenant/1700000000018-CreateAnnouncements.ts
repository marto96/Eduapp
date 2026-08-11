import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnouncements1700000000018 implements MigrationInterface {
  name = 'CreateAnnouncements1700000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "announcements" (
        "id" uuid PRIMARY KEY,
        "title" varchar NOT NULL,
        "body" text NOT NULL,
        "category" varchar NOT NULL,
        "published_at" date NOT NULL,
        "published_by" uuid NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "announcements"`);
  }
}
