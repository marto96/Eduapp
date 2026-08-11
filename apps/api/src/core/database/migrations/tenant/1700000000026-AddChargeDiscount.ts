import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChargeDiscount1700000000026 implements MigrationInterface {
  name = 'AddChargeDiscount1700000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "charges" ADD COLUMN "discount_amount" real NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "charges" DROP COLUMN "discount_amount"`);
  }
}
