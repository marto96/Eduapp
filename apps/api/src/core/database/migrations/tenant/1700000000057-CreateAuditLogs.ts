import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sin FK hacia `users`: un log de auditoría debe sobrevivir aunque el
 * usuario que ejecutó la acción sea borrado después — `actor_email`/
 * `actor_roles` quedan como snapshot de texto, no una referencia viva.
 */
export class CreateAuditLogs1700000000057 implements MigrationInterface {
  name = 'CreateAuditLogs1700000000057';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY,
        "actor_id" uuid,
        "actor_email" varchar,
        "actor_roles" text[],
        "method" varchar NOT NULL,
        "route" varchar NOT NULL,
        "resource_id" varchar,
        "status_code" int,
        "success" boolean NOT NULL,
        "kind" varchar NOT NULL,
        "ip_address" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_actor_email" ON "audit_logs" ("actor_email")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
