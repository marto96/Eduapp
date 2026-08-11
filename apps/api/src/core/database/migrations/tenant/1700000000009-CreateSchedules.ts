import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La validación de conflictos vive en `CreateScheduleUseCase`; el
 * constraint `EXCLUDE` a nivel de base que cierra la ventana de carrera
 * se agregó después, en `1700000000015-AddScheduleOverlapConstraint`.
 */
export class CreateSchedules1700000000009 implements MigrationInterface {
  name = 'CreateSchedules1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "schedules" (
        "id" uuid PRIMARY KEY,
        "section_id" uuid NOT NULL REFERENCES "sections"("id") ON DELETE CASCADE,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
        "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "academic_year_id" uuid NOT NULL REFERENCES "academic_years"("id") ON DELETE CASCADE,
        "day_of_week" varchar NOT NULL,
        "start_time" varchar NOT NULL,
        "end_time" varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "schedules"`);
  }
}
