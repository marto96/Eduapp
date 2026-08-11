import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Defensa en profundidad sobre la validación de `CreateScheduleUseCase`:
 * ese chequeo tiene una ventana de carrera entre el `findAll` y el
 * `save` (dos requests concurrentes podrían colar una superposición). El
 * `EXCLUDE` de Postgres cierra esa ventana a nivel de base.
 *
 * `start_time`/`end_time` son `varchar` ("HH:mm"), no un tipo de rango
 * nativo. La forma obvia de comparar rangos —castear a `timestamp` y
 * armar un `tsrange`— no sirve para un índice: el cast `text::timestamp`
 * usa `timestamp_in`, que Postgres marca `STABLE` (depende de
 * `DateStyle`), y un `EXCLUDE`/índice funcional exige que la expresión
 * sea `IMMUTABLE`. Por eso se arma un `int4range` en minutos desde
 * medianoche a mano (`substring` + cast a `int`, ambos sí `IMMUTABLE`) en
 * vez de parsear la hora con un tipo de fecha/hora.
 *
 * `WHERE (deleted_at IS NULL)`: constraint parcial, para no bloquear un
 * horario nuevo contra uno ya borrado (soft-delete).
 */
export class AddScheduleOverlapConstraint1700000000015 implements MigrationInterface {
  name = 'AddScheduleOverlapConstraint1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    const rangeExpr = `
      int4range(
        (substring("start_time" from 1 for 2)::int * 60 + substring("start_time" from 4 for 2)::int),
        (substring("end_time" from 1 for 2)::int * 60 + substring("end_time" from 4 for 2)::int)
      )
    `;

    await queryRunner.query(`
      ALTER TABLE "schedules" ADD CONSTRAINT "excl_schedules_teacher_overlap"
      EXCLUDE USING gist (
        "teacher_id" WITH =,
        "day_of_week" WITH =,
        ${rangeExpr} WITH &&
      ) WHERE ("deleted_at" IS NULL)
    `);

    await queryRunner.query(`
      ALTER TABLE "schedules" ADD CONSTRAINT "excl_schedules_section_overlap"
      EXCLUDE USING gist (
        "section_id" WITH =,
        "academic_year_id" WITH =,
        "day_of_week" WITH =,
        ${rangeExpr} WITH &&
      ) WHERE ("deleted_at" IS NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT "excl_schedules_section_overlap"`);
    await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT "excl_schedules_teacher_overlap"`);
  }
}
