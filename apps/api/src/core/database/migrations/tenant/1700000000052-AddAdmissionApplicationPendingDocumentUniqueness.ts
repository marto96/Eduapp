import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `CreateAdmissionApplicationUseCase` ya valida a nivel de aplicación que no
 * exista otra solicitud en curso (`pendiente_pago`/`pendiente_entrevista`)
 * para el mismo documento, pero es un chequeo read-then-write: dos envíos
 * concurrentes del mismo formulario público podrían pasar ambos la
 * validación. Este índice parcial (solo sobre filas en esos dos estados) es
 * el backstop a nivel de base de datos, mismo criterio ya aplicado a
 * usuarios en `1700000000049-AddUserDocumentNumberUniqueness`.
 */
export class AddAdmissionApplicationPendingDocumentUniqueness1700000000052 implements MigrationInterface {
  name = 'AddAdmissionApplicationPendingDocumentUniqueness1700000000052';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_admission_applications_pending_document"
      ON "admission_applications" ("student_document_number")
      WHERE "status" IN ('pendiente_pago', 'pendiente_entrevista')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_admission_applications_pending_document"`);
  }
}
