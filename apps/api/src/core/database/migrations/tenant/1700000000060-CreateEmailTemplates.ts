import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Una fila por tipo de correo, solo si el colegio lo personalizó — si no
 * existe fila para un `type`, `EmailTemplateService` usa el default
 * hardcodeado en código (ver default-email-templates.ts).
 */
export class CreateEmailTemplates1700000000060 implements MigrationInterface {
  name = 'CreateEmailTemplates1700000000060';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "email_templates" (
        "id" uuid PRIMARY KEY,
        "type" varchar(40) NOT NULL UNIQUE,
        "subject" varchar(255) NOT NULL,
        "body" text NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_templates"`);
  }
}
