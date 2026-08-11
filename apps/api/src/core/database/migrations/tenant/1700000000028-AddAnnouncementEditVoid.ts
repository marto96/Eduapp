import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnouncementEditVoid1700000000028 implements MigrationInterface {
  name = 'AddAnnouncementEditVoid1700000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "announcements"
      ADD COLUMN "edited_at" timestamptz,
      ADD COLUMN "voided_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "announcements"
      DROP COLUMN "edited_at",
      DROP COLUMN "voided_at"
    `);
  }
}
