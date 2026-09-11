import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1700000000067 implements MigrationInterface {
  name = 'CreateNotifications1700000000067';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY,
        "recipient_user_id" uuid NOT NULL,
        "type" varchar NOT NULL,
        "title" varchar NOT NULL,
        "body" varchar NOT NULL,
        "link" varchar NOT NULL,
        "created_at" timestamptz NOT NULL,
        "read_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_recipient" ON "notifications" ("recipient_user_id", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
