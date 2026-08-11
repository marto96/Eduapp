import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Mismo criterio que `1700000000015-AddScheduleOverlapConstraint`: defensa
 * en profundidad sobre la validación de `CreateLeaveUseCase`, para la
 * ventana de carrera entre el `findAll` y el `save`.
 *
 * A diferencia de `schedules`, `start_date`/`end_date` ya son `date`
 * nativo, así que se usa `daterange` directo (sin necesidad de armar un
 * `tsrange` con fecha ancla). `'[]'`: rango inclusivo en ambos extremos,
 * igual que `Leave.overlaps()` en el dominio (`startDate <= endDate`).
 */
export class AddLeaveOverlapConstraint1700000000016 implements MigrationInterface {
  name = 'AddLeaveOverlapConstraint1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    await queryRunner.query(`
      ALTER TABLE "leaves" ADD CONSTRAINT "excl_leaves_employee_overlap"
      EXCLUDE USING gist (
        "employee_id" WITH =,
        daterange("start_date", "end_date", '[]') WITH &&
      ) WHERE ("deleted_at" IS NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leaves" DROP CONSTRAINT "excl_leaves_employee_overlap"`);
  }
}
