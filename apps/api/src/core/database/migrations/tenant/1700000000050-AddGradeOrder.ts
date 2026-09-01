import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Secuencia entre grados (Sexto=6, Séptimo=7, etc.) — necesaria para poder
 * validar que un estudiante no retroceda a un grado inferior al máximo que
 * ya cursó al volver a matricularse. Los grados existentes quedan en 0 y
 * deben editarse desde la UI de Grados para fijar su orden real.
 */
export class AddGradeOrder1700000000050 implements MigrationInterface {
  name = 'AddGradeOrder1700000000050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "grades" ADD COLUMN "order" int NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "grades" DROP COLUMN "order"`);
  }
}
