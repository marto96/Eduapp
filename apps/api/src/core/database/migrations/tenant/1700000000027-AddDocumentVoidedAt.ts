import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentVoidedAt1700000000027 implements MigrationInterface {
  name = 'AddDocumentVoidedAt1700000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "voided_at" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "voided_at"`);
  }
}
