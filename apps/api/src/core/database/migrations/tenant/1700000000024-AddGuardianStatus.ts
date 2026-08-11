import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuardianStatus1700000000024 implements MigrationInterface {
  name = 'AddGuardianStatus1700000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "guardians" ADD COLUMN "status" varchar NOT NULL DEFAULT 'approved'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "guardians" DROP COLUMN "status"`);
  }
}
