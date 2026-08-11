import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventSection1700000000033 implements MigrationInterface {
  name = 'AddEventSection1700000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
      ADD COLUMN "section_id" uuid REFERENCES "sections"("id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "section_id"`);
  }
}
