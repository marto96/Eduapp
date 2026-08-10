import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCharges1700000000010 implements MigrationInterface {
  name = 'CreateCharges1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "charges" (
        "id" uuid PRIMARY KEY,
        "enrollment_id" uuid NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
        "concept" varchar NOT NULL,
        "description" varchar NOT NULL,
        "amount" real NOT NULL,
        "due_date" date NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "charges"`);
  }
}
