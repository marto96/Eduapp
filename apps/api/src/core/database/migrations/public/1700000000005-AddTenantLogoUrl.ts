import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantLogoUrl1700000000005 implements MigrationInterface {
  name = 'AddTenantLogoUrl1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenants" ADD COLUMN "logo_url" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "logo_url"`);
  }
}
