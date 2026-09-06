import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `status` ('active'/'closed') nunca se apagaba (ningún caso de uso lo
 * transicionaba) y el módulo de admisiones lo usaba igual para adivinar
 * "el año lectivo actual" — con varios años "active" a la vez elegía
 * cualquiera. Este campo es independiente: indica explícitamente si ESE
 * año lectivo acepta solicitudes de admisión ahora mismo. Puede haber más
 * de un año con `admissions_open = true` simultáneamente (ej. admisiones
 * del año siguiente abren en octubre, mientras el año en curso todavía
 * recibe ingresos de segundo semestre).
 */
export class AddAdmissionsOpenToAcademicYears1700000000058 implements MigrationInterface {
  name = 'AddAdmissionsOpenToAcademicYears1700000000058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "academic_years" ADD COLUMN "admissions_open" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "academic_years" DROP COLUMN "admissions_open"`);
  }
}
