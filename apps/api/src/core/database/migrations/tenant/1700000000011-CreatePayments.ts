import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayments1700000000011 implements MigrationInterface {
  name = 'CreatePayments1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY,
        "charge_id" uuid NOT NULL REFERENCES "charges"("id") ON DELETE CASCADE,
        "amount" real NOT NULL,
        "method" varchar NOT NULL,
        "paid_at" date NOT NULL,
        "reference" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payments"`);
  }
}
