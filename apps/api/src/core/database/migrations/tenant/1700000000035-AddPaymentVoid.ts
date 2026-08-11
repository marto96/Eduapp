import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentVoid1700000000035 implements MigrationInterface {
  name = 'AddPaymentVoid1700000000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "voided_at" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "voided_at"`);
  }
}
