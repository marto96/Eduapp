import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nota mínima única para todo el colegio (no por materia) — se agrega a la
 * misma fila de configuración compartida que ya tiene los 3 pesos, en vez
 * de una tabla nueva.
 */
export class AddMinPassingGradeToWeightConfig1700000000062 implements MigrationInterface {
  name = 'AddMinPassingGradeToWeightConfig1700000000062';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "grade_weight_configs" ADD COLUMN "min_passing_grade" real NOT NULL DEFAULT 3.0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "grade_weight_configs" DROP COLUMN "min_passing_grade"`);
  }
}
