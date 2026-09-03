import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Una sola fila por colegio (tenant) — no hay endpoint de "crear", solo
 * get-or-create-default (ver `GradeWeightConfigService`) + edit. Los 3
 * pesos deben sumar 1 (con tolerancia de punto flotante), validado en la
 * capa de aplicación, no acá.
 */
export class CreateGradeWeightConfigs1700000000055 implements MigrationInterface {
  name = 'CreateGradeWeightConfigs1700000000055';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "grade_weight_configs" (
        "id" uuid PRIMARY KEY,
        "actividad_weight" real NOT NULL DEFAULT 0.65,
        "evaluacion_bimestral_weight" real NOT NULL DEFAULT 0.25,
        "disciplina_weight" real NOT NULL DEFAULT 0.10,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "grade_weight_configs"`);
  }
}
