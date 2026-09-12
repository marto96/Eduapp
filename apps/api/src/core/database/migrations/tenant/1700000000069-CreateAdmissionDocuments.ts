import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Un registro por (solicitud, tipo) — volver a subir el mismo tipo
 * reemplaza el archivo anterior (misma storage key determinística,
 * ver TypeOrmAdmissionDocumentRepository), no se versiona.
 */
export class CreateAdmissionDocuments1700000000069 implements MigrationInterface {
  name = 'CreateAdmissionDocuments1700000000069';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admission_documents" (
        "id" uuid PRIMARY KEY,
        "admission_application_id" uuid NOT NULL REFERENCES "admission_applications"("id") ON DELETE CASCADE,
        "type" varchar NOT NULL,
        "storage_key" varchar NOT NULL,
        "original_filename" varchar NOT NULL,
        "uploaded_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_admission_documents_application_type"
      ON "admission_documents" ("admission_application_id", "type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admission_documents"`);
  }
}
