import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Soporte de clases virtuales: `schedules.is_virtual` marca qué horarios
 * tienen videollamada habilitada (la sala se deriva del id, no se persiste
 * ningún link). `class_cancellations` registra la cancelación de UNA fecha
 * puntual de un horario recurrente, sin tocar las demás semanas.
 */
export class AddVirtualClassSupport1700000000047 implements MigrationInterface {
  name = 'AddVirtualClassSupport1700000000047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schedules" ADD COLUMN "is_virtual" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE TABLE "class_cancellations" (
        "id" uuid PRIMARY KEY,
        "schedule_id" uuid NOT NULL REFERENCES "schedules"("id") ON DELETE CASCADE,
        "date" date NOT NULL,
        "cancelled_by" uuid NOT NULL REFERENCES "users"("id"),
        "reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_class_cancellations_schedule_date"
      ON "class_cancellations" ("schedule_id", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "class_cancellations"`);
    await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "is_virtual"`);
  }
}
