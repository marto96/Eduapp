import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnouncementSection1700000000032 implements MigrationInterface {
  name = 'AddAnnouncementSection1700000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "announcements"
      ADD COLUMN "section_id" uuid REFERENCES "sections"("id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "announcements" DROP COLUMN "section_id"`);
  }
}
