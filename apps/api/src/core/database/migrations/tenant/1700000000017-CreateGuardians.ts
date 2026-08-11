import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGuardians1700000000017 implements MigrationInterface {
  name = 'CreateGuardians1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "guardians" (
        "id" uuid PRIMARY KEY,
        "guardian_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "student_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_guardians_guardian_student"
      ON "guardians" ("guardian_user_id", "student_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "guardians"`);
  }
}
