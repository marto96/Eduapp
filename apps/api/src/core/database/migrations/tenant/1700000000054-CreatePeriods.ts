import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Un `Período` (bimestre/trimestre) por año lectivo, con su propio peso —
 * la suma de los `weight` de todos los períodos de un año lectivo debería
 * ser 1, pero no se fuerza a nivel de base (se validan de a uno, ver
 * `CreatePeriodUseCase`/`EditPeriodUseCase`, mientras se van cargando).
 */
export class CreatePeriods1700000000054 implements MigrationInterface {
  name = 'CreatePeriods1700000000054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "periods" (
        "id" uuid PRIMARY KEY,
        "academic_year_id" uuid NOT NULL REFERENCES "academic_years"("id") ON DELETE CASCADE,
        "name" varchar NOT NULL,
        "order" int NOT NULL,
        "weight" real NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_periods_academic_year" ON "periods" ("academic_year_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "periods"`);
  }
}
