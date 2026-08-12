import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBankTransactions1700000000040 implements MigrationInterface {
  name = 'CreateBankTransactions1700000000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "bank_transactions" (
        "id" uuid PRIMARY KEY,
        "date" date NOT NULL,
        "amount" numeric NOT NULL,
        "description" text NOT NULL,
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        "matched_payment_id" uuid REFERENCES "payments"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "bank_transactions"`);
  }
}
