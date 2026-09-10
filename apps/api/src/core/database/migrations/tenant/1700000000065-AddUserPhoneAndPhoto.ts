import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Teléfono de contacto y foto de perfil — ambos opcionales, para el perfil
 * de autoservicio (cualquier usuario puede subir su propia foto y cargar
 * su teléfono, ver EditMyProfileUseCase/UploadMyProfilePhotoUseCase).
 */
export class AddUserPhoneAndPhoto1700000000065 implements MigrationInterface {
  name = 'AddUserPhoneAndPhoto1700000000065';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "phone" varchar,
      ADD COLUMN "photo_url" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "phone",
      DROP COLUMN "photo_url"
    `);
  }
}
