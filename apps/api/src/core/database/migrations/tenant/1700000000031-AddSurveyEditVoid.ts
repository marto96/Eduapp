import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSurveyEditVoid1700000000031 implements MigrationInterface {
  name = 'AddSurveyEditVoid1700000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "surveys"
      ADD COLUMN "edited_at" timestamptz,
      ADD COLUMN "voided_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "surveys"
      DROP COLUMN "edited_at",
      DROP COLUMN "voided_at"
    `);
  }
}
