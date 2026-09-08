import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 2FA opcional para `platform_admins`: `totp_enabled` arranca en `false`
 * para no romper la cuenta ya sembrada — el login sigue funcionando solo
 * con contraseña hasta que el superadmin da de alta el 2FA por su cuenta.
 */
export class AddPlatformAdminTotp1700000000006 implements MigrationInterface {
  name = 'AddPlatformAdminTotp1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_admins"
        ADD COLUMN "totp_secret" text,
        ADD COLUMN "totp_enabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN "recovery_code_hashes" text[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_admins"
        DROP COLUMN "totp_secret",
        DROP COLUMN "totp_enabled",
        DROP COLUMN "recovery_code_hashes"
    `);
  }
}
