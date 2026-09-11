import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `document_type_prices` no tiene fila para un tipo sin precio configurado
 * todavía — se trata como gratis (amount 0) a nivel de aplicación, ver
 * `ListDocumentTypePricesUseCase`. `document_requests.charge_id` es nullable
 * porque una solicitud gratis nunca crea un cargo.
 */
export class CreateDocumentTypePricesAndRequests1700000000066 implements MigrationInterface {
  name = 'CreateDocumentTypePricesAndRequests1700000000066';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "document_type_prices" (
        "type" varchar PRIMARY KEY,
        "amount" real NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "document_requests" (
        "id" uuid PRIMARY KEY,
        "enrollment_id" uuid NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
        "type" varchar NOT NULL,
        "delivery_method" varchar NOT NULL,
        "note" varchar,
        "requested_by" uuid NOT NULL,
        "requested_at" timestamptz NOT NULL,
        "status" varchar NOT NULL,
        "charge_id" uuid REFERENCES "charges"("id") ON DELETE SET NULL,
        "issued_document_id" uuid REFERENCES "documents"("id") ON DELETE SET NULL,
        "resolved_by" uuid,
        "resolved_at" timestamptz,
        "rejection_reason" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_document_requests_enrollment_id" ON "document_requests" ("enrollment_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_document_requests_status" ON "document_requests" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "document_requests"`);
    await queryRunner.query(`DROP TABLE "document_type_prices"`);
  }
}
