import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1700000000001 implements MigrationInterface {
  name = 'CreateUsers1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY,
        "email" varchar NOT NULL UNIQUE,
        "password_hash" varchar NOT NULL,
        "first_name" varchar NOT NULL,
        "last_name" varchar NOT NULL,
        "roles" text[] NOT NULL DEFAULT '{}',
        "status" varchar NOT NULL DEFAULT 'invited',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
