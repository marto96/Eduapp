import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marca, además del actor real (el usuario impersonado), si la acción se
 * hizo a través de una sesión de impersonación de un superadmin — ver
 * docs/superpowers/specs/2026-09-09-tenant-impersonation-design.md.
 */
export class AddImpersonatedByToAuditLogs1700000000064 implements MigrationInterface {
  name = 'AddImpersonatedByToAuditLogs1700000000064';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_logs" ADD COLUMN "impersonated_by" uuid NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "impersonated_by"`);
  }
}
