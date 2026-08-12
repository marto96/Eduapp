import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageAttachment1700000000038 implements MigrationInterface {
  name = 'AddMessageAttachment1700000000038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN "attachment_url" varchar`);
    await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN "attachment_name" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "attachment_name"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "attachment_url"`);
  }
}
