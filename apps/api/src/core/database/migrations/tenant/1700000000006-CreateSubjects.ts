import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubjects1700000000006 implements MigrationInterface {
  name = 'CreateSubjects1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subjects" (
        "id" uuid PRIMARY KEY,
        "name" varchar NOT NULL,
        "area" varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subjects"`);
  }
}
