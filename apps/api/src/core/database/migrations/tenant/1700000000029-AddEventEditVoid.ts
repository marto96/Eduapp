import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventEditVoid1700000000029 implements MigrationInterface {
  name = 'AddEventEditVoid1700000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
      ADD COLUMN "edited_at" timestamptz,
      ADD COLUMN "voided_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
      DROP COLUMN "edited_at",
      DROP COLUMN "voided_at"
    `);
  }
}
