import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantPrimaryColor1700000000004 implements MigrationInterface {
  name = 'AddTenantPrimaryColor1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenants" ADD COLUMN "primary_color" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "primary_color"`);
  }
}
