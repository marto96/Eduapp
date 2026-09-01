import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdmissions1700000000051 implements MigrationInterface {
  name = 'CreateAdmissions1700000000051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admission_applications" (
        "id" uuid PRIMARY KEY,
        "tracking_code" varchar NOT NULL,
        "student_first_name" varchar NOT NULL,
        "student_last_name" varchar NOT NULL,
        "student_birth_date" date NOT NULL,
        "student_document_type" varchar NOT NULL,
        "student_document_number" varchar NOT NULL,
        "student_address" text NOT NULL,
        "grade_id" uuid NOT NULL REFERENCES "grades"("id"),
        "academic_year_id" uuid NOT NULL REFERENCES "academic_years"("id"),
        "guardian_name" varchar NOT NULL,
        "guardian_email" varchar NOT NULL,
        "guardian_phone" varchar NOT NULL,
        "status" varchar NOT NULL,
        "fee_amount" real NOT NULL,
        "paid_at" timestamptz,
        "interview_date" timestamptz,
        "interview_notes" text,
        "rejection_reason" text,
        "matched_user_id" uuid REFERENCES "users"("id"),
        "resulting_enrollment_id" uuid REFERENCES "enrollments"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_admission_applications_tracking_code"
      ON "admission_applications" ("tracking_code")
    `);

    await queryRunner.query(`
      CREATE TABLE "admission_payment_attempts" (
        "id" uuid PRIMARY KEY,
        "admission_application_id" uuid NOT NULL REFERENCES "admission_applications"("id") ON DELETE CASCADE,
        "gateway_preference_id" varchar NOT NULL,
        "amount" real NOT NULL,
        "status" varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admission_payment_attempts"`);
    await queryRunner.query(`DROP TABLE "admission_applications"`);
  }
}
