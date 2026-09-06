import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registra qué cargos de pensión ya recibieron el recordatorio de
 * vencimiento, para que `SendPensionReminderTask` no lo reenvíe todos los
 * días mientras el cargo siga impago (se decidió "una sola vez", ver spec).
 * Tabla aditiva — no toca `charges`.
 */
export class CreatePensionReminderLog1700000000061 implements MigrationInterface {
  name = 'CreatePensionReminderLog1700000000061';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pension_reminder_log" (
        "id" uuid PRIMARY KEY,
        "charge_id" uuid NOT NULL UNIQUE REFERENCES "charges"("id") ON DELETE CASCADE,
        "sent_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pension_reminder_log"`);
  }
}
