import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Índices en columnas FK consultadas en cada carga de pantalla (bandeja de
 * mensajes, contador de no leídos, listado de cargos/pagos, boletines,
 * webhook de pagos) que hasta ahora dependían de un full table scan —
 * ningún índice en el schema de tenant cubría estas columnas (los únicos
 * 5 índices existentes son `UNIQUE` compuestos usados como conflict target,
 * no para lectura).
 */
export class AddHotPathIndexes1700000000044 implements MigrationInterface {
  name = 'AddHotPathIndexes1700000000044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "IDX_messages_sender_id" ON "messages" ("sender_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_messages_recipient_id" ON "messages" ("recipient_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_charge_id" ON "payments" ("charge_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_charges_enrollment_id" ON "charges" ("enrollment_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_evaluations_section_academic_year" ON "evaluations" ("section_id", "academic_year_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_evaluations_subject_id" ON "evaluations" ("subject_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_payment_attempts_charge_id" ON "payment_attempts" ("charge_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_payment_attempts_guardian_user_id" ON "payment_attempts" ("guardian_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_documents_enrollment_id" ON "documents" ("enrollment_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_employees_user_id" ON "employees" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_sections_grade_id" ON "sections" ("grade_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_sections_grade_id"`);
    await queryRunner.query(`DROP INDEX "IDX_employees_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_documents_enrollment_id"`);
    await queryRunner.query(`DROP INDEX "IDX_payment_attempts_guardian_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_payment_attempts_charge_id"`);
    await queryRunner.query(`DROP INDEX "IDX_evaluations_subject_id"`);
    await queryRunner.query(`DROP INDEX "IDX_evaluations_section_academic_year"`);
    await queryRunner.query(`DROP INDEX "IDX_charges_enrollment_id"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_charge_id"`);
    await queryRunner.query(`DROP INDEX "IDX_messages_recipient_id"`);
    await queryRunner.query(`DROP INDEX "IDX_messages_sender_id"`);
  }
}
