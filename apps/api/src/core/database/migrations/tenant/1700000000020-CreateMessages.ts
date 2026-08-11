import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessages1700000000020 implements MigrationInterface {
  name = 'CreateMessages1700000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid PRIMARY KEY,
        "sender_id" uuid NOT NULL REFERENCES "users"("id"),
        "recipient_id" uuid NOT NULL REFERENCES "users"("id"),
        "body" text NOT NULL,
        "sent_at" timestamptz NOT NULL DEFAULT now(),
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "messages"`);
  }
}
