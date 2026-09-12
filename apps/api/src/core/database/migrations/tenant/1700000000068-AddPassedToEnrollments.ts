import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nullable a propósito: `null` significa "todavía no se completó o se
 * completó antes de que este campo existiera" — no se asume aprobado ni
 * reprobado para matrículas viejas. Se setea explícitamente recién cuando
 * se completa una matrícula (ver CompleteEnrollmentUseCase), y determina
 * si "renovar" sugiere el mismo grado (repitiendo) o el siguiente.
 */
export class AddPassedToEnrollments1700000000068 implements MigrationInterface {
  name = 'AddPassedToEnrollments1700000000068';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "enrollments"
      ADD COLUMN "passed" boolean
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "enrollments"
      DROP COLUMN "passed"
    `);
  }
}
