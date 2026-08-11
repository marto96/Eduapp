import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBooks1700000000036 implements MigrationInterface {
  name = 'CreateBooks1700000000036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "books" (
        "id" uuid PRIMARY KEY,
        "title" varchar NOT NULL,
        "author" varchar NOT NULL,
        "total_copies" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "books"`);
  }
}
