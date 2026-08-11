import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageEditedAt1700000000021 implements MigrationInterface {
  name = 'AddMessageEditedAt1700000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN "edited_at" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "edited_at"`);
  }
}
