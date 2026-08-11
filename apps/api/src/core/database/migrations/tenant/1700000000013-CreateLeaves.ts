import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La validación de conflictos vive en `CreateLeaveUseCase`; el constraint
 * `EXCLUDE` a nivel de base se agregó después, en
 * `1700000000016-AddLeaveOverlapConstraint`.
 */
export class CreateLeaves1700000000013 implements MigrationInterface {
  name = 'CreateLeaves1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "leaves" (
        "id" uuid PRIMARY KEY,
        "employee_id" uuid NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
        "type" varchar NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "reason" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "leaves"`);
  }
}
