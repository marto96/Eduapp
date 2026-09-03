import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `type` (examen/tarea/proyecto/otro, sin relación a pesos) se reemplaza
 * por `category` (actividad/evaluacion_bimestral/disciplina, la categoría
 * ponderada real); `period` (texto libre) pasa a `period_id` (FK a la
 * nueva tabla `periods`). No hay forma automática de mapear datos viejos a
 * este esquema nuevo (una evaluación vieja no tiene categoría ni periodo
 * formal), así que se limpian las evaluaciones y notas existentes — este
 * proyecto todavía no tiene datos de producción reales, solo de desarrollo.
 */
export class ReplaceEvaluationTypeWithCategory1700000000056 implements MigrationInterface {
  name = 'ReplaceEvaluationTypeWithCategory1700000000056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cascada a `grade_scores` vía su FK ON DELETE CASCADE (ver
    // 1700000000008-CreateGradeScores).
    await queryRunner.query(`DELETE FROM "evaluations"`);

    await queryRunner.query(`ALTER TABLE "evaluations" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "evaluations" DROP COLUMN "period"`);

    await queryRunner.query(`ALTER TABLE "evaluations" ADD COLUMN "category" varchar NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "evaluations" ADD COLUMN "period_id" uuid NOT NULL REFERENCES "periods"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`ALTER TABLE "evaluations" ADD COLUMN "label" varchar`);

    await queryRunner.query(`
      CREATE INDEX "IDX_evaluations_period_category" ON "evaluations" ("period_id", "category")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "evaluations"`);
    await queryRunner.query(`DROP INDEX "IDX_evaluations_period_category"`);
    await queryRunner.query(`ALTER TABLE "evaluations" DROP COLUMN "label"`);
    await queryRunner.query(`ALTER TABLE "evaluations" DROP COLUMN "period_id"`);
    await queryRunner.query(`ALTER TABLE "evaluations" DROP COLUMN "category"`);
    await queryRunner.query(`ALTER TABLE "evaluations" ADD COLUMN "type" varchar NOT NULL DEFAULT 'otro'`);
    await queryRunner.query(`ALTER TABLE "evaluations" ADD COLUMN "period" varchar NOT NULL DEFAULT ''`);
  }
}
