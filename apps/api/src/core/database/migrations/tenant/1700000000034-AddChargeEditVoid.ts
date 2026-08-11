import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChargeEditVoid1700000000034 implements MigrationInterface {
  name = 'AddChargeEditVoid1700000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "charges"
      ADD COLUMN "edited_at" timestamptz,
      ADD COLUMN "voided_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "charges"
      DROP COLUMN "edited_at",
      DROP COLUMN "voided_at"
    `);
  }
}
