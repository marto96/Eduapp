import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoans1700000000037 implements MigrationInterface {
  name = 'CreateLoans1700000000037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "loans" (
        "id" uuid PRIMARY KEY,
        "book_id" uuid NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "borrowed_at" timestamptz NOT NULL,
        "due_date" date NOT NULL,
        "returned_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "loans"`);
  }
}
