import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Mismo patrón que 1700000000015-AddScheduleOverlapConstraint.ts: la
 * expresión int4range se arma a mano desde start_time/end_time (varchar
 * "HH:mm") porque el cast a timestamp no es IMMUTABLE y un EXCLUDE lo
 * exige. btree_gist ya está habilitado desde esa migración.
 */
export class CreateClassroomsAndScheduleConflict1700000000070 implements MigrationInterface {
  name = 'CreateClassroomsAndScheduleConflict1700000000070';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "classrooms" (
        "id" uuid PRIMARY KEY,
        "name" varchar NOT NULL,
        "capacity" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "schedules" ADD COLUMN "classroom_id" uuid REFERENCES "classrooms"("id")
    `);

    const rangeExpr = `
      int4range(
        (substring("start_time" from 1 for 2)::int * 60 + substring("start_time" from 4 for 2)::int),
        (substring("end_time" from 1 for 2)::int * 60 + substring("end_time" from 4 for 2)::int)
      )
    `;

    await queryRunner.query(`
      ALTER TABLE "schedules" ADD CONSTRAINT "excl_schedules_classroom_overlap"
      EXCLUDE USING gist (
        "classroom_id" WITH =,
        "academic_year_id" WITH =,
        "day_of_week" WITH =,
        ${rangeExpr} WITH &&
      ) WHERE ("deleted_at" IS NULL AND "classroom_id" IS NOT NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT "excl_schedules_classroom_overlap"`);
    await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "classroom_id"`);
    await queryRunner.query(`DROP TABLE "classrooms"`);
  }
}
