import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformAdmins1700000000003 implements MigrationInterface {
  name = 'CreatePlatformAdmins1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "platform_admins" (
        "id" uuid PRIMARY KEY,
        "email" varchar NOT NULL UNIQUE,
        "password_hash" varchar NOT NULL,
        "full_name" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "platform_admins"`);
  }
}
