import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El índice único en (enrollment_id, date) es el conflict target del
 * `ON CONFLICT ... DO UPDATE` que usa `TypeOrmAttendanceRecordRepository.upsertMany`
 * — sin él, `repo.upsert(...)` no sabría contra qué constraint resolver.
 */
export class CreateAttendanceRecords1700000000005 implements MigrationInterface {
  name = 'CreateAttendanceRecords1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "attendance_records" (
        "id" uuid PRIMARY KEY,
        "enrollment_id" uuid NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
        "date" date NOT NULL,
        "status" varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_attendance_records_enrollment_date"
      ON "attendance_records" ("enrollment_id", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "attendance_records"`);
  }
}
