import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El número de documento es único por persona en la vida real; se valida a
 * nivel de aplicación en `CreateUserUseCase`, pero el índice parcial (solo
 * sobre filas con documento cargado) evita duplicados también ante escrituras
 * concurrentes o futuras que no pasen por ese caso de uso.
 */
export class AddUserDocumentNumberUniqueness1700000000049 implements MigrationInterface {
  name = 'AddUserDocumentNumberUniqueness1700000000049';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_document_number"
      ON "users" ("document_number")
      WHERE "document_number" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_document_number"`);
  }
}
