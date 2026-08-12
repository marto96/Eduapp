import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnouncementReads1700000000042 implements MigrationInterface {
  name = 'CreateAnnouncementReads1700000000042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "announcement_reads" (
        "announcement_id" uuid NOT NULL REFERENCES "announcements"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "read_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("announcement_id", "user_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "announcement_reads"`);
  }
}
