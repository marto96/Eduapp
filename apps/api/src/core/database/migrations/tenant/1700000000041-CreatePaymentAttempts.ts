import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentAttempts1700000000041 implements MigrationInterface {
  name = 'CreatePaymentAttempts1700000000041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_attempts" (
        "id" uuid PRIMARY KEY,
        "charge_id" uuid NOT NULL REFERENCES "charges"("id"),
        "guardian_user_id" uuid NOT NULL REFERENCES "users"("id"),
        "gateway_preference_id" varchar NOT NULL,
        "amount" real NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payment_attempts"`);
  }
}
