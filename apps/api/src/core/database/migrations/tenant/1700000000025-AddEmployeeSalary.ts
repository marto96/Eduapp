import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeeSalary1700000000025 implements MigrationInterface {
  name = 'AddEmployeeSalary1700000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "employees" ADD COLUMN "salary" real`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "salary"`);
  }
}
