import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `schedule_id` liga cada asistencia a una clase concreta (materia+sección+
 * día+hora) en vez de solo a la sección del día — habilita contar
 * inasistencia por materia. Los registros previos a esta migración quedan
 * con `schedule_id` nulo (no se migran retroactivamente); Postgres no trata
 * los NULL como iguales en un índice único, así que conviven sin romper el
 * nuevo constraint.
 */
export class AddScheduleIdToAttendanceRecords1700000000053 implements MigrationInterface {
  name = 'AddScheduleIdToAttendanceRecords1700000000053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      ADD COLUMN "schedule_id" uuid REFERENCES "schedules"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`DROP INDEX "IDX_attendance_records_enrollment_date"`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_attendance_records_enrollment_schedule_date"
      ON "attendance_records" ("enrollment_id", "schedule_id", "date")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_records_schedule_date"
      ON "attendance_records" ("schedule_id", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_attendance_records_schedule_date"`);
    await queryRunner.query(`DROP INDEX "IDX_attendance_records_enrollment_schedule_date"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_attendance_records_enrollment_date"
      ON "attendance_records" ("enrollment_id", "date")
    `);
    await queryRunner.query(`ALTER TABLE "attendance_records" DROP COLUMN "schedule_id"`);
  }
}
