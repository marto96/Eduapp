import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentPdfGeneratedAt1700000000039 implements MigrationInterface {
  name = 'AddDocumentPdfGeneratedAt1700000000039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" ADD COLUMN "pdf_generated_at" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "pdf_generated_at"`);
  }
}
