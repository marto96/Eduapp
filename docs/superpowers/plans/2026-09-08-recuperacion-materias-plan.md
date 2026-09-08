# Recuperación de materias por periodo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar que un estudiante recuperó una materia en un periodo puntual, reemplazando la nota de ese periodo en todas las pantallas (gradebook del docente, Calificaciones del estudiante, boletín en PDF), y rediseñar el boletín para mostrar solo la nota final por materia, agrupada por área con periodos como columnas.

**Architecture:** Una nota mínima aprobatoria única por colegio se agrega al `GradeWeightConfig` existente. Una nueva entidad `GradeRecovery` (una fila por combinación matrícula+materia+periodo) se aplica como override de `grade`/`isPartial` en los DOS únicos lugares que hoy calculan la nota de un periodo (`GetGradebookUseCase`, `GetSubjectPeriodDetailUseCase`), garantizando que nunca haya dos pantallas mostrando cosas distintas. El boletín en PDF deja de calcular sus propias filas y pasa a **llamar a `GetGradebookUseCase`** por estudiante, reusando el mismo cálculo (incluida la recuperación) y agrupando el resultado por `Subject.area` (campo ya existente) en una tabla con periodos como columnas.

**Tech Stack:** NestJS (hexagonal: domain/application/infrastructure/interface), TypeORM (Postgres, schema por tenant), Next.js App Router + React Query (frontend), pdfkit (PDF), Jest (tests backend — no hay framework de test en el frontend web, así que las tareas de frontend se verifican manualmente en el navegador).

**Spec:** [docs/superpowers/specs/2026-09-08-recuperacion-materias-design.md](../specs/2026-09-08-recuperacion-materias-design.md)

## Global Constraints

- La nota mínima aprobatoria (`minPassingGrade`) es **única para todo el colegio**, no por materia, con default **3.0**, rango válido `(0, 5]`.
- La recuperación es **por materia y periodo** (no por evaluación individual, no anual).
- La nota de recuperación **reemplaza** la nota del periodo (no se muestran ambas) y entra **tal cual** al cálculo del acumulado, sin tope.
- Nadie más que `AuditInterceptor` registra quién cargó una recuperación — no se agrega un campo `recordedBy` a `GradeRecovery` (mismo criterio que `GradeScore`).
- El boletín en PDF muestra **solo** la nota final por materia (nunca el detalle de evaluaciones sueltas), agrupada por `Subject.area`, con periodos como columnas + una columna "Definitiva", y una fila de promedio por área en cada columna. Una materia sin `area` cae en "Sin área". Los promedios excluyen materias sin nota en esa columna.
- Todo cambio al cálculo de la nota de un periodo se aplica en `GetGradebookUseCase` y `GetSubjectPeriodDetailUseCase` — nunca se duplica la lógica en un tercer lugar (el boletín en PDF consume `GetGradebookUseCase`, no reimplementa nada).

---

## Task 1: Nota mínima aprobatoria (`minPassingGrade`) en `GradeWeightConfig`

**Files:**
- Modify: `apps/api/src/modules/grading/domain/entities/grade-weight-config.entity.ts`
- Create: `apps/api/src/modules/grading/domain/entities/grade-weight-config.entity.spec.ts`
- Modify: `apps/api/src/modules/grading/infrastructure/entities/grade-weight-config.orm-entity.ts`
- Modify: `apps/api/src/modules/grading/infrastructure/repositories/typeorm-grade-weight-config.repository.ts`
- Create: `apps/api/src/core/database/migrations/tenant/1700000000062-AddMinPassingGradeToWeightConfig.ts`
- Modify: `apps/api/src/modules/grading/application/use-cases/edit-grade-weight-config.use-case.ts`
- Modify: `apps/api/src/modules/grading/application/use-cases/edit-grade-weight-config.use-case.spec.ts`
- Modify: `apps/api/src/modules/grading/interface/dtos/edit-grade-weight-config.dto.ts`
- Modify: `packages/shared-types/src/index.ts`
- Modify: `apps/web/src/features/grading/use-grade-weight-config.ts`
- Modify: `apps/web/src/features/academic/components/edit-grade-weight-config-button.tsx`

**Interfaces:**
- Produces: `GradeWeightConfig.minPassingGrade: number` (default `3.0`), `GradeWeightConfig.edit(actividadWeight, evaluacionBimestralWeight, disciplinaWeight, minPassingGrade)`. Usado por `GradeCalculationService`-adjacent code en las Tasks 3-5 vía `weights.minPassingGrade`.

- [ ] **Step 1: Escribir el test que falla para la entidad**

Crear `apps/api/src/modules/grading/domain/entities/grade-weight-config.entity.spec.ts`:

```ts
import { GradeWeightConfig } from './grade-weight-config.entity';

describe('GradeWeightConfig', () => {
  it('usa 3.0 como nota mínima por defecto si no se especifica', () => {
    const config = new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1);
    expect(config.minPassingGrade).toBe(3.0);
  });

  it('rechaza una nota mínima fuera de rango al crear', () => {
    expect(() => new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1, 0)).toThrow(
      'La nota mínima aprobatoria debe estar entre 0 y 5',
    );
    expect(() => new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1, 5.1)).toThrow(
      'La nota mínima aprobatoria debe estar entre 0 y 5',
    );
  });

  it('rechaza una nota mínima fuera de rango al editar', () => {
    const config = new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1);
    expect(() => config.edit(0.6, 0.3, 0.1, -1)).toThrow(
      'La nota mínima aprobatoria debe estar entre 0 y 5',
    );
  });

  it('edita la nota mínima cuando es válida', () => {
    const config = new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1);
    config.edit(0.6, 0.3, 0.1, 3.5);
    expect(config.minPassingGrade).toBe(3.5);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest grade-weight-config.entity.spec.ts`
Expected: FAIL — `minPassingGrade` no existe en `GradeWeightConfig`, `edit` no acepta un 4to argumento.

- [ ] **Step 3: Implementar — agregar `minPassingGrade` a la entidad**

Reemplazar el contenido completo de `apps/api/src/modules/grading/domain/entities/grade-weight-config.entity.ts`:

```ts
export type GradeCategory = 'actividad' | 'evaluacion_bimestral' | 'disciplina';

const WEIGHT_TOLERANCE = 0.001;

export class GradeWeightConfig {
  constructor(
    public readonly id: string,
    public actividadWeight: number,
    public evaluacionBimestralWeight: number,
    public disciplinaWeight: number,
    public minPassingGrade: number = 3.0,
  ) {
    GradeWeightConfig.assertSumsToOne(actividadWeight, evaluacionBimestralWeight, disciplinaWeight);
    GradeWeightConfig.assertValidMinPassingGrade(minPassingGrade);
  }

  edit(
    actividadWeight: number,
    evaluacionBimestralWeight: number,
    disciplinaWeight: number,
    minPassingGrade: number,
  ): void {
    GradeWeightConfig.assertSumsToOne(actividadWeight, evaluacionBimestralWeight, disciplinaWeight);
    GradeWeightConfig.assertValidMinPassingGrade(minPassingGrade);
    this.actividadWeight = actividadWeight;
    this.evaluacionBimestralWeight = evaluacionBimestralWeight;
    this.disciplinaWeight = disciplinaWeight;
    this.minPassingGrade = minPassingGrade;
  }

  weightFor(category: GradeCategory): number {
    if (category === 'actividad') return this.actividadWeight;
    if (category === 'evaluacion_bimestral') return this.evaluacionBimestralWeight;
    return this.disciplinaWeight;
  }

  private static assertSumsToOne(a: number, b: number, c: number): void {
    if (Math.abs(a + b + c - 1) > WEIGHT_TOLERANCE) {
      throw new Error('Los tres pesos deben sumar 100%');
    }
  }

  private static assertValidMinPassingGrade(minPassingGrade: number): void {
    if (minPassingGrade <= 0 || minPassingGrade > 5) {
      throw new Error('La nota mínima aprobatoria debe estar entre 0 y 5');
    }
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest grade-weight-config.entity.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Actualizar el use-case de edición y su test**

En `apps/api/src/modules/grading/application/use-cases/edit-grade-weight-config.use-case.ts`, reemplazar el contenido completo:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

export interface EditGradeWeightConfigInput {
  actividadWeight: number;
  evaluacionBimestralWeight: number;
  disciplinaWeight: number;
  minPassingGrade: number;
}

@Injectable()
export class EditGradeWeightConfigUseCase {
  constructor(private readonly configService: GradeWeightConfigService) {}

  async execute(input: EditGradeWeightConfigInput): Promise<GradeWeightConfig> {
    const config = await this.configService.getOrCreateDefault();
    try {
      config.edit(
        input.actividadWeight,
        input.evaluacionBimestralWeight,
        input.disciplinaWeight,
        input.minPassingGrade,
      );
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    await this.configService.save(config);
    return config;
  }
}
```

En `apps/api/src/modules/grading/application/use-cases/edit-grade-weight-config.use-case.spec.ts`, actualizar las dos llamadas a `useCase.execute(...)` para incluir `minPassingGrade: 3.0`, y agregar un tercer test:

```ts
import { BadRequestException } from '@nestjs/common';
import { EditGradeWeightConfigUseCase } from './edit-grade-weight-config.use-case';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

describe('EditGradeWeightConfigUseCase', () => {
  const configs: jest.Mocked<GradeWeightConfigRepositoryPort> = {
    findFirst: jest.fn(),
    save: jest.fn(),
  };
  const configService = new GradeWeightConfigService(configs);
  const useCase = new EditGradeWeightConfigUseCase(configService);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si los pesos no suman 100%', async () => {
    configs.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1));

    await expect(
      useCase.execute({
        actividadWeight: 0.5,
        evaluacionBimestralWeight: 0.3,
        disciplinaWeight: 0.3,
        minPassingGrade: 3.0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza si la nota mínima está fuera de rango', async () => {
    configs.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1));

    await expect(
      useCase.execute({
        actividadWeight: 0.65,
        evaluacionBimestralWeight: 0.25,
        disciplinaWeight: 0.1,
        minPassingGrade: 6,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('actualiza los pesos y la nota mínima cuando son válidos', async () => {
    configs.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1));

    const result = await useCase.execute({
      actividadWeight: 0.6,
      evaluacionBimestralWeight: 0.3,
      disciplinaWeight: 0.1,
      minPassingGrade: 3.5,
    });

    expect(result.actividadWeight).toBe(0.6);
    expect(result.minPassingGrade).toBe(3.5);
    expect(configs.save).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 6: Correr los tests del use-case**

Run: `cd apps/api && npx jest edit-grade-weight-config.use-case.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: DTO, ORM entity, repositorio y migración**

Reemplazar `apps/api/src/modules/grading/interface/dtos/edit-grade-weight-config.dto.ts`:

```ts
import { IsNumber, Max, Min } from 'class-validator';

export class EditGradeWeightConfigDto {
  @IsNumber()
  @Min(0.01)
  @Max(0.99)
  actividadWeight: number;

  @IsNumber()
  @Min(0.01)
  @Max(0.99)
  evaluacionBimestralWeight: number;

  @IsNumber()
  @Min(0.01)
  @Max(0.99)
  disciplinaWeight: number;

  @IsNumber()
  @Min(0.1)
  @Max(5)
  minPassingGrade: number;
}
```

Reemplazar `apps/api/src/modules/grading/infrastructure/entities/grade-weight-config.orm-entity.ts`:

```ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'grade_weight_configs' })
export class GradeWeightConfigOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actividad_weight', type: 'real' })
  actividadWeight: number;

  @Column({ name: 'evaluacion_bimestral_weight', type: 'real' })
  evaluacionBimestralWeight: number;

  @Column({ name: 'disciplina_weight', type: 'real' })
  disciplinaWeight: number;

  @Column({ name: 'min_passing_grade', type: 'real', default: 3.0 })
  minPassingGrade: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
```

Reemplazar `apps/api/src/modules/grading/infrastructure/repositories/typeorm-grade-weight-config.repository.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GradeWeightConfigRepositoryPort } from '../../application/ports/grade-weight-config.repository.port';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';
import { GradeWeightConfigOrmEntity } from '../entities/grade-weight-config.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmGradeWeightConfigRepository extends GradeWeightConfigRepositoryPort {
  private readonly repo: Repository<GradeWeightConfigOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(GradeWeightConfigOrmEntity);
  }

  async findFirst(): Promise<GradeWeightConfig | null> {
    const row = await this.repo.find({ take: 1 });
    return row[0] ? this.toDomain(row[0]) : null;
  }

  async save(config: GradeWeightConfig): Promise<void> {
    await this.repo.save({
      id: config.id,
      actividadWeight: config.actividadWeight,
      evaluacionBimestralWeight: config.evaluacionBimestralWeight,
      disciplinaWeight: config.disciplinaWeight,
      minPassingGrade: config.minPassingGrade,
    });
  }

  private toDomain(row: GradeWeightConfigOrmEntity): GradeWeightConfig {
    return new GradeWeightConfig(
      row.id,
      row.actividadWeight,
      row.evaluacionBimestralWeight,
      row.disciplinaWeight,
      row.minPassingGrade,
    );
  }
}
```

Crear `apps/api/src/core/database/migrations/tenant/1700000000062-AddMinPassingGradeToWeightConfig.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nota mínima única para todo el colegio (no por materia) — se agrega a la
 * misma fila de configuración compartida que ya tiene los 3 pesos, en vez
 * de una tabla nueva.
 */
export class AddMinPassingGradeToWeightConfig1700000000062 implements MigrationInterface {
  name = 'AddMinPassingGradeToWeightConfig1700000000062';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "grade_weight_configs" ADD COLUMN "min_passing_grade" real NOT NULL DEFAULT 3.0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "grade_weight_configs" DROP COLUMN "min_passing_grade"`);
  }
}
```

- [ ] **Step 8: Correr la migración contra la base de desarrollo**

Run: `cd apps/api && npm run migration:run:tenant:all`
Expected: la migración `AddMinPassingGradeToWeightConfig1700000000062` corre sin error contra el schema `tenant_colegio_demo` (y cualquier otro tenant existente).

- [ ] **Step 9: Correr toda la suite de backend antes de seguir**

Run: `cd apps/api && npm test`
Expected: PASS, sin regresiones.

- [ ] **Step 10: Frontend — shared-types, hook y botón de configuración**

En `packages/shared-types/src/index.ts`, en la interfaz `GradeWeightConfig` (línea ~465), agregar el campo:

```ts
export interface GradeWeightConfig {
  id: string;
  actividadWeight: number;
  evaluacionBimestralWeight: number;
  disciplinaWeight: number;
  minPassingGrade: number;
}
```

En `apps/web/src/features/grading/use-grade-weight-config.ts`, agregar `minPassingGrade: number;` a `EditGradeWeightConfigInput`:

```ts
export interface EditGradeWeightConfigInput {
  actividadWeight: number;
  evaluacionBimestralWeight: number;
  disciplinaWeight: number;
  minPassingGrade: number;
}
```

En `apps/web/src/features/academic/components/edit-grade-weight-config-button.tsx`, agregar el estado y el campo del formulario. Después de la línea `const [disciplina, setDisciplina] = useState('');` agregar:

```tsx
  const [minPassingGrade, setMinPassingGrade] = useState('');
```

En el `useEffect` que llena los campos desde `config`, agregar:

```tsx
  useEffect(() => {
    if (!config) return;
    setActividad(String(Math.round(config.actividadWeight * 100)));
    setEvaluacionBimestral(String(Math.round(config.evaluacionBimestralWeight * 100)));
    setDisciplina(String(Math.round(config.disciplinaWeight * 100)));
    setMinPassingGrade(String(config.minPassingGrade));
  }, [config]);
```

En `handleSubmit`, agregar `minPassingGrade: Number(minPassingGrade)` al objeto que se pasa a `editConfig.mutate(...)`:

```tsx
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (totalPercent !== 100) return;
    editConfig.mutate(
      {
        actividadWeight: Number(actividad) / 100,
        evaluacionBimestralWeight: Number(evaluacionBimestral) / 100,
        disciplinaWeight: Number(disciplina) / 100,
        minPassingGrade: Number(minPassingGrade),
      },
      { onSuccess: () => setOpen(false) },
    );
  }
```

Y agregar un cuarto campo de input en el JSX, después del bloque de "Disciplina (%)" y antes del `</div>` que cierra `flex flex-wrap items-end gap-3`:

```tsx
            <div className="space-y-1.5">
              <Label htmlFor="minPassingGrade">Nota mínima aprobatoria</Label>
              <Input
                id="minPassingGrade"
                type="number"
                min={0.1}
                max={5}
                step="0.1"
                value={minPassingGrade}
                onChange={(e) => setMinPassingGrade(e.target.value)}
                className="w-24"
              />
            </div>
```

- [ ] **Step 11: Verificar manualmente en el navegador**

No hay framework de test en `apps/web`. Levantar el stack (`docker compose up -d` si Postgres/Redis no están corriendo, luego `npm run dev` en `apps/api` y `apps/web`), loguearse como `admin@colegio-demo.test` / `Demo12345!`, ir a Académico → Años lectivos → "Configurar pesos", confirmar que aparece el campo "Nota mínima aprobatoria" con el valor `3` precargado, cambiarlo y guardar, recargar la página y confirmar que el nuevo valor persiste.

- [ ] **Step 12: Commit**

```bash
git add apps/api/src/modules/grading/domain/entities/grade-weight-config.entity.ts \
  apps/api/src/modules/grading/domain/entities/grade-weight-config.entity.spec.ts \
  apps/api/src/modules/grading/infrastructure/entities/grade-weight-config.orm-entity.ts \
  apps/api/src/modules/grading/infrastructure/repositories/typeorm-grade-weight-config.repository.ts \
  apps/api/src/core/database/migrations/tenant/1700000000062-AddMinPassingGradeToWeightConfig.ts \
  apps/api/src/modules/grading/application/use-cases/edit-grade-weight-config.use-case.ts \
  apps/api/src/modules/grading/application/use-cases/edit-grade-weight-config.use-case.spec.ts \
  apps/api/src/modules/grading/interface/dtos/edit-grade-weight-config.dto.ts \
  packages/shared-types/src/index.ts \
  apps/web/src/features/grading/use-grade-weight-config.ts \
  apps/web/src/features/academic/components/edit-grade-weight-config-button.tsx
git commit -m "feat(grading): agregar nota mínima aprobatoria única por colegio"
```

---

## Task 2: Entidad `GradeRecovery` (dominio, ORM, puerto, repositorio, migración)

**Files:**
- Create: `apps/api/src/modules/grading/domain/entities/grade-recovery.entity.ts`
- Create: `apps/api/src/modules/grading/application/ports/grade-recovery.repository.port.ts`
- Create: `apps/api/src/modules/grading/infrastructure/entities/grade-recovery.orm-entity.ts`
- Create: `apps/api/src/modules/grading/infrastructure/repositories/typeorm-grade-recovery.repository.ts`
- Create: `apps/api/src/core/database/migrations/tenant/1700000000063-CreateGradeRecoveries.ts`
- Modify: `apps/api/src/modules/grading/grading.module.ts`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `GradeRecovery { id, enrollmentId, subjectId, periodId, score }`, `GradeRecoveryRepositoryPort.findByKey(enrollmentId, subjectId, periodId)`, `.findAll({ enrollmentId })`, `.upsert(recovery)` — usados por la Task 3 (`RecordGradeRecoveryUseCase`) y las Tasks 4-5 (`GetGradebookUseCase`, `GetSubjectPeriodDetailUseCase`).

No hay TypeORM repositories con test unitario en este código base (son de infraestructura, se verifican corriendo la migración e integrándolos en las tasks siguientes) — este task no tiene ciclo TDD propio, se verifica con la migración y con `npm run build`.

- [ ] **Step 1: Entidad de dominio**

Crear `apps/api/src/modules/grading/domain/entities/grade-recovery.entity.ts`:

```ts
export class GradeRecovery {
  constructor(
    public readonly id: string,
    public readonly enrollmentId: string,
    public readonly subjectId: string,
    public readonly periodId: string,
    public score: number,
  ) {}
}
```

- [ ] **Step 2: Puerto del repositorio**

Crear `apps/api/src/modules/grading/application/ports/grade-recovery.repository.port.ts`:

```ts
import { GradeRecovery } from '../../domain/entities/grade-recovery.entity';

export interface GradeRecoveryFilter {
  enrollmentId?: string;
}

export abstract class GradeRecoveryRepositoryPort {
  abstract findByKey(enrollmentId: string, subjectId: string, periodId: string): Promise<GradeRecovery | null>;
  abstract findAll(filter?: GradeRecoveryFilter): Promise<GradeRecovery[]>;
  /** Upsert por (enrollmentId, subjectId, periodId): si ya existe, actualiza el score. */
  abstract upsert(recovery: GradeRecovery): Promise<void>;
}
```

- [ ] **Step 3: Entidad ORM**

Crear `apps/api/src/modules/grading/infrastructure/entities/grade-recovery.orm-entity.ts`:

```ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'grade_recoveries' })
export class GradeRecoveryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'enrollment_id' })
  enrollmentId: string;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @Column({ name: 'period_id' })
  periodId: string;

  @Column({ type: 'real' })
  score: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
```

- [ ] **Step 4: Repositorio TypeORM**

Crear `apps/api/src/modules/grading/infrastructure/repositories/typeorm-grade-recovery.repository.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  GradeRecoveryFilter,
  GradeRecoveryRepositoryPort,
} from '../../application/ports/grade-recovery.repository.port';
import { GradeRecovery } from '../../domain/entities/grade-recovery.entity';
import { GradeRecoveryOrmEntity } from '../entities/grade-recovery.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmGradeRecoveryRepository extends GradeRecoveryRepositoryPort {
  private readonly repo: Repository<GradeRecoveryOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(GradeRecoveryOrmEntity);
  }

  async findByKey(enrollmentId: string, subjectId: string, periodId: string): Promise<GradeRecovery | null> {
    const row = await this.repo.findOne({ where: { enrollmentId, subjectId, periodId } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(filter?: GradeRecoveryFilter): Promise<GradeRecovery[]> {
    const rows = await this.repo.find({
      where: { ...(filter?.enrollmentId && { enrollmentId: filter.enrollmentId }) },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async upsert(recovery: GradeRecovery): Promise<void> {
    await this.repo.upsert(
      {
        id: recovery.id,
        enrollmentId: recovery.enrollmentId,
        subjectId: recovery.subjectId,
        periodId: recovery.periodId,
        score: recovery.score,
      },
      { conflictPaths: ['enrollmentId', 'subjectId', 'periodId'], skipUpdateIfNoValuesChanged: true },
    );
  }

  private toDomain(row: GradeRecoveryOrmEntity): GradeRecovery {
    return new GradeRecovery(row.id, row.enrollmentId, row.subjectId, row.periodId, row.score);
  }
}
```

- [ ] **Step 5: Migración**

Crear `apps/api/src/core/database/migrations/tenant/1700000000063-CreateGradeRecoveries.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Una sola recuperación vigente por (enrollment, subject, period) — registrar
 * de nuevo actualiza la existente en vez de crear un duplicado (upsert por
 * el índice único, ver `TypeOrmGradeRecoveryRepository`). No guarda quién
 * la cargó — eso queda en `audit_logs`, igual que `grade_scores`.
 */
export class CreateGradeRecoveries1700000000063 implements MigrationInterface {
  name = 'CreateGradeRecoveries1700000000063';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "grade_recoveries" (
        "id" uuid PRIMARY KEY,
        "enrollment_id" uuid NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
        "period_id" uuid NOT NULL REFERENCES "periods"("id") ON DELETE CASCADE,
        "score" real NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_grade_recoveries_unique_key"
      ON "grade_recoveries" ("enrollment_id", "subject_id", "period_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "grade_recoveries"`);
  }
}
```

- [ ] **Step 6: Correr la migración contra la base de desarrollo**

Run: `cd apps/api && npm run migration:run:tenant:all`
Expected: la migración `CreateGradeRecoveries1700000000063` corre sin error, crea la tabla `grade_recoveries` en `tenant_colegio_demo`.

- [ ] **Step 7: Registrar el repositorio en el módulo**

En `apps/api/src/modules/grading/grading.module.ts`, agregar los imports:

```ts
import { GradeRecoveryRepositoryPort } from './application/ports/grade-recovery.repository.port';
import { TypeOrmGradeRecoveryRepository } from './infrastructure/repositories/typeorm-grade-recovery.repository';
```

Y agregar al array `providers`, junto a los otros `{ provide: ..., useClass: ... }`:

```ts
    { provide: GradeRecoveryRepositoryPort, useClass: TypeOrmGradeRecoveryRepository },
```

- [ ] **Step 8: Verificar que compila**

Run: `cd apps/api && npm run build`
Expected: compila sin errores (la entidad ORM nueva se recoge automáticamente vía el glob de `TENANT_MODULES` en `tenant.datasource.ts` — no hace falta tocar ese archivo).

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/grading/domain/entities/grade-recovery.entity.ts \
  apps/api/src/modules/grading/application/ports/grade-recovery.repository.port.ts \
  apps/api/src/modules/grading/infrastructure/entities/grade-recovery.orm-entity.ts \
  apps/api/src/modules/grading/infrastructure/repositories/typeorm-grade-recovery.repository.ts \
  apps/api/src/core/database/migrations/tenant/1700000000063-CreateGradeRecoveries.ts \
  apps/api/src/modules/grading/grading.module.ts
git commit -m "feat(grading): agregar entidad y repositorio de GradeRecovery"
```

---

## Task 3: `RecordGradeRecoveryUseCase` + endpoint

**Files:**
- Create: `apps/api/src/modules/grading/application/use-cases/record-grade-recovery.use-case.ts`
- Create: `apps/api/src/modules/grading/application/use-cases/record-grade-recovery.use-case.spec.ts`
- Create: `apps/api/src/modules/grading/interface/dtos/record-grade-recovery.dto.ts`
- Modify: `apps/api/src/modules/grading/interface/controllers/gradebook.controller.ts`
- Modify: `apps/api/src/modules/grading/grading.module.ts`

**Interfaces:**
- Consumes: `GradeRecoveryRepositoryPort` (Task 2), `GradeWeightConfigService.getOrCreateDefault()` → `weights.minPassingGrade` (Task 1), `GradeCalculationService.computeSubjectPeriodGrade` (existente).
- Produces: `RecordGradeRecoveryUseCase.execute(input: RecordGradeRecoveryInput, currentUser): Promise<GradeRecovery>`, endpoint `POST /grading/gradebook/:enrollmentId/recovery`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `apps/api/src/modules/grading/application/use-cases/record-grade-recovery.use-case.spec.ts`:

```ts
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecordGradeRecoveryUseCase } from './record-grade-recovery.use-case';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeRecoveryRepositoryPort } from '../ports/grade-recovery.repository.port';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { Subject } from '../../../academic/domain/entities/subject.entity';
import { Period } from '../../../academic/domain/entities/period.entity';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { GradeRecovery } from '../../domain/entities/grade-recovery.entity';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('RecordGradeRecoveryUseCase', () => {
  const enrollments = { findAll: jest.fn(), findById: jest.fn(), findActiveByStudentAndYear: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EnrollmentRepositoryPort>;
  const subjects = { findAll: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<SubjectRepositoryPort>;
  const periods = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<PeriodRepositoryPort>;
  const evaluations = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EvaluationRepositoryPort>;
  const scores = { findAll: jest.fn(), upsertMany: jest.fn() } as unknown as jest.Mocked<GradeScoreRepositoryPort>;
  const recoveries = { findByKey: jest.fn(), findAll: jest.fn(), upsert: jest.fn() } as unknown as jest.Mocked<GradeRecoveryRepositoryPort>;
  const weightConfigRepo = { findFirst: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<GradeWeightConfigRepositoryPort>;
  const weightConfigService = new GradeWeightConfigService(weightConfigRepo);
  const enrollmentAccess = { canTeacherAccessSection: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new RecordGradeRecoveryUseCase(
    enrollments,
    subjects,
    periods,
    evaluations,
    scores,
    recoveries,
    weightConfigService,
    enrollmentAccess,
  );

  const enrollment = new Enrollment('enr-1', 'student-1', 'section-1', 'year-1', 'active');
  const docente: JwtPayload = { sub: 'docente-1', email: 'd@d.com', roles: ['docente'], tenantId: 't1' };
  const period = new Period('p1', 'year-1', 'Primer periodo', 1, 0.25, '2026-01-20', '2026-03-20');
  const input = { enrollmentId: 'enr-1', subjectId: 'subject-1', periodId: 'p1', score: 3.5 };

  beforeEach(() => {
    jest.clearAllMocks();
    enrollments.findById.mockResolvedValue(enrollment);
    enrollmentAccess.canTeacherAccessSection = jest.fn().mockResolvedValue(true);
    periods.findById.mockResolvedValue(period);
    subjects.findAll.mockResolvedValue([new Subject('subject-1', 'Biología', 'Ciencias')]);
    evaluations.findAll.mockResolvedValue([
      new Evaluation('eval-1', 'subject-1', 'section-1', 'year-1', 'p1', 'actividad', 5, 'Taller 1'),
    ]);
    scores.findAll.mockResolvedValue([new GradeScore('score-1', 'eval-1', 'enr-1', 2)]); // 2/5 -> 2 en escala 0-5, reprobado
    weightConfigRepo.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1, 3.0));
    recoveries.findByKey.mockResolvedValue(new GradeRecovery('rec-1', 'enr-1', 'subject-1', 'p1', 3.5));
  });

  it('rechaza si la matrícula no existe', async () => {
    enrollments.findById.mockResolvedValue(null);
    await expect(useCase.execute(input, docente)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el docente no tiene acceso a la sección', async () => {
    enrollmentAccess.canTeacherAccessSection = jest.fn().mockResolvedValue(false);
    await expect(useCase.execute(input, docente)).rejects.toThrow(ForbiddenException);
  });

  it('rechaza si el periodo no existe o no es de ese año lectivo', async () => {
    periods.findById.mockResolvedValue(null);
    await expect(useCase.execute(input, docente)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si la materia no existe', async () => {
    subjects.findAll.mockResolvedValue([]);
    await expect(useCase.execute(input, docente)).rejects.toThrow(NotFoundException);
  });

  it('rechaza una nota de recuperación fuera de rango', async () => {
    await expect(useCase.execute({ ...input, score: -1 }, docente)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute({ ...input, score: 5.1 }, docente)).rejects.toThrow(BadRequestException);
  });

  it('rechaza si la materia ya está aprobada en ese periodo', async () => {
    scores.findAll.mockResolvedValue([new GradeScore('score-1', 'eval-1', 'enr-1', 5)]); // 5/5 -> 5, aprobado
    await expect(useCase.execute(input, docente)).rejects.toThrow(ConflictException);
  });

  it('permite recuperar una materia sin ninguna evaluación cargada todavía', async () => {
    evaluations.findAll.mockResolvedValue([]);
    scores.findAll.mockResolvedValue([]);
    await useCase.execute(input, docente);
    expect(recoveries.upsert).toHaveBeenCalledTimes(1);
  });

  it('guarda la recuperación cuando la materia está reprobada y retorna el registro', async () => {
    const result = await useCase.execute(input, docente);

    expect(recoveries.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: 'enr-1', subjectId: 'subject-1', periodId: 'p1', score: 3.5 }),
    );
    expect(result).toEqual(new GradeRecovery('rec-1', 'enr-1', 'subject-1', 'p1', 3.5));
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd apps/api && npx jest record-grade-recovery.use-case.spec.ts`
Expected: FAIL — el módulo `./record-grade-recovery.use-case` no existe.

- [ ] **Step 3: Implementar el use-case**

Crear `apps/api/src/modules/grading/application/use-cases/record-grade-recovery.use-case.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeRecoveryRepositoryPort } from '../ports/grade-recovery.repository.port';
import { GradeRecovery } from '../../domain/entities/grade-recovery.entity';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeCalculationService, EvaluationItem } from '../../domain/services/grade-calculation.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface RecordGradeRecoveryInput {
  enrollmentId: string;
  subjectId: string;
  periodId: string;
  score: number;
}

@Injectable()
export class RecordGradeRecoveryUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(SubjectRepositoryPort) private readonly subjects: SubjectRepositoryPort,
    @Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort,
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    @Inject(GradeScoreRepositoryPort) private readonly scores: GradeScoreRepositoryPort,
    @Inject(GradeRecoveryRepositoryPort) private readonly recoveries: GradeRecoveryRepositoryPort,
    private readonly weightConfigService: GradeWeightConfigService,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(input: RecordGradeRecoveryInput, currentUser: JwtPayload): Promise<GradeRecovery> {
    const enrollment = await this.enrollments.findById(input.enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${input.enrollmentId}"`);
    }

    const canAccess = await this.enrollmentAccess.canTeacherAccessSection(currentUser, enrollment.sectionId);
    if (!canAccess) {
      throw new ForbiddenException('No tenés un horario asignado en esa sección');
    }

    const period = await this.periods.findById(input.periodId);
    if (!period || period.academicYearId !== enrollment.academicYearId) {
      throw new NotFoundException(`No existe el periodo "${input.periodId}" para ese año lectivo`);
    }

    const allSubjects = await this.subjects.findAll();
    const subject = allSubjects.find((s) => s.id === input.subjectId);
    if (!subject) {
      throw new NotFoundException(`No existe la materia "${input.subjectId}"`);
    }

    if (input.score < 0 || input.score > 5) {
      throw new BadRequestException(`La nota de recuperación ${input.score} está fuera de rango (0-5)`);
    }

    const [subjectEvaluations, scoresForEnrollment, weights] = await Promise.all([
      this.evaluations.findAll({
        sectionId: enrollment.sectionId,
        academicYearId: enrollment.academicYearId,
        subjectId: input.subjectId,
        periodId: input.periodId,
      }),
      this.scores.findAll({ enrollmentId: input.enrollmentId }),
      this.weightConfigService.getOrCreateDefault(),
    ]);

    const scoreByEvaluationId = new Map(scoresForEnrollment.map((s) => [s.evaluationId, s.score]));
    const items: EvaluationItem[] = subjectEvaluations.map((e) => ({
      evaluationId: e.id,
      category: e.category,
      label: e.label,
      maxScore: e.maxScore,
      rawScore: scoreByEvaluationId.get(e.id) ?? null,
    }));
    const { grade } = GradeCalculationService.computeSubjectPeriodGrade(items, weights);

    if (grade !== null && grade >= weights.minPassingGrade) {
      throw new ConflictException('Esta materia ya está aprobada en ese periodo — no hace falta recuperarla');
    }

    const recovery = new GradeRecovery(randomUUID(), input.enrollmentId, input.subjectId, input.periodId, input.score);
    await this.recoveries.upsert(recovery);

    return (await this.recoveries.findByKey(input.enrollmentId, input.subjectId, input.periodId))!;
  }
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `cd apps/api && npx jest record-grade-recovery.use-case.spec.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: DTO y endpoint**

Crear `apps/api/src/modules/grading/interface/dtos/record-grade-recovery.dto.ts`:

```ts
import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class RecordGradeRecoveryDto {
  @IsUUID()
  subjectId: string;

  @IsUUID()
  periodId: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  score: number;
}
```

En `apps/api/src/modules/grading/interface/controllers/gradebook.controller.ts`, agregar el import:

```ts
import { RecordGradeRecoveryUseCase } from '../../application/use-cases/record-grade-recovery.use-case';
import { RecordGradeRecoveryDto } from '../dtos/record-grade-recovery.dto';
```

Agregar `private readonly recordGradeRecovery: RecordGradeRecoveryUseCase,` al constructor, y agregar el endpoint después de `create(...)`:

```ts
  @Post(':enrollmentId/recovery')
  @CheckPolicies((ability) => ability.can('create', 'Grading'))
  async recordRecovery(
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: RecordGradeRecoveryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recordGradeRecovery.execute(
      { enrollmentId, subjectId: dto.subjectId, periodId: dto.periodId, score: dto.score },
      user,
    );
  }
```

(Se usa `ability.can('create', 'Grading')` — el mismo permiso que ya protege `POST :enrollmentId/grades` en este mismo controlador, no `'manage'`: docente/directivo/admin ya tienen `manage` sobre `Grading`, que incluye `create`.)

En `apps/api/src/modules/grading/grading.module.ts`, agregar el import y sumarlo a `providers`:

```ts
import { RecordGradeRecoveryUseCase } from './application/use-cases/record-grade-recovery.use-case';
```

```ts
    RecordGradeRecoveryUseCase,
```

- [ ] **Step 6: Correr toda la suite de backend**

Run: `cd apps/api && npm test`
Expected: PASS, sin regresiones.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/grading/application/use-cases/record-grade-recovery.use-case.ts \
  apps/api/src/modules/grading/application/use-cases/record-grade-recovery.use-case.spec.ts \
  apps/api/src/modules/grading/interface/dtos/record-grade-recovery.dto.ts \
  apps/api/src/modules/grading/interface/controllers/gradebook.controller.ts \
  apps/api/src/modules/grading/grading.module.ts
git commit -m "feat(grading): agregar RecordGradeRecoveryUseCase y su endpoint"
```

---

## Task 4: Aplicar la recuperación en `GetGradebookUseCase` + exponer `subjectArea`

**Files:**
- Modify: `apps/api/src/modules/grading/application/use-cases/get-gradebook.use-case.ts`
- Modify: `apps/api/src/modules/grading/application/use-cases/get-gradebook.use-case.spec.ts`

**Interfaces:**
- Consumes: `GradeRecoveryRepositoryPort.findAll({ enrollmentId })` (Task 2).
- Produces: `GradebookPeriodCell.isRecovered: boolean`, `GradebookSubjectRow.subjectArea: string` — consumidos por la Task 9 (boletín en PDF) y la Task 6 (frontend).

- [ ] **Step 1: Actualizar el test existente para el nuevo puerto y agregar los casos de recuperación**

Reemplazar el contenido completo de `apps/api/src/modules/grading/application/use-cases/get-gradebook.use-case.spec.ts`:

```ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetGradebookUseCase } from './get-gradebook.use-case';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { SectionRepositoryPort } from '../../../academic/application/ports/section.repository.port';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { ScheduleRepositoryPort } from '../../../schedule/application/ports/schedule.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeRecoveryRepositoryPort } from '../ports/grade-recovery.repository.port';
import { AttendanceRecordRepositoryPort } from '../../../attendance/application/ports/attendance-record.repository.port';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { Section } from '../../../academic/domain/entities/section.entity';
import { Subject } from '../../../academic/domain/entities/subject.entity';
import { AcademicYear } from '../../../academic/domain/entities/academic-year.entity';
import { Period } from '../../../academic/domain/entities/period.entity';
import { Schedule } from '../../../schedule/domain/entities/schedule.entity';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { GradeRecovery } from '../../domain/entities/grade-recovery.entity';
import { AttendanceRecord } from '../../../attendance/domain/entities/attendance-record.entity';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('GetGradebookUseCase', () => {
  const enrollments = { findAll: jest.fn(), findById: jest.fn(), findActiveByStudentAndYear: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EnrollmentRepositoryPort>;
  const users = { findAll: jest.fn(), findById: jest.fn(), findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<UserRepositoryPort>;
  const sections = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<SectionRepositoryPort>;
  const subjects = { findAll: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<SubjectRepositoryPort>;
  const academicYears = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<AcademicYearRepositoryPort>;
  const periods = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<PeriodRepositoryPort>;
  const schedules = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<ScheduleRepositoryPort>;
  const evaluations = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EvaluationRepositoryPort>;
  const scores = { findAll: jest.fn(), upsertMany: jest.fn() } as unknown as jest.Mocked<GradeScoreRepositoryPort>;
  const recoveries = { findByKey: jest.fn(), findAll: jest.fn(), upsert: jest.fn() } as unknown as jest.Mocked<GradeRecoveryRepositoryPort>;
  const attendance = { findAll: jest.fn(), upsertMany: jest.fn() } as unknown as jest.Mocked<AttendanceRecordRepositoryPort>;
  const weightConfigRepo = { findFirst: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<GradeWeightConfigRepositoryPort>;
  const weightConfigService = new GradeWeightConfigService(weightConfigRepo);
  const enrollmentAccess = { resolveAccessibleEnrollmentIds: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new GetGradebookUseCase(
    enrollments,
    users,
    sections,
    subjects,
    academicYears,
    periods,
    schedules,
    evaluations,
    scores,
    recoveries,
    attendance,
    weightConfigService,
    enrollmentAccess,
  );

  const enrollment = new Enrollment('enr-1', 'student-1', 'section-1', 'year-1', 'active');
  const admin: JwtPayload = { sub: 'admin-1', roles: ['admin_institucion'], tenantId: 't1' } as JwtPayload;

  beforeEach(() => {
    jest.clearAllMocks();
    enrollments.findById.mockResolvedValue(enrollment);
    enrollmentAccess.resolveAccessibleEnrollmentIds = jest.fn().mockResolvedValue(null);
    users.findById.mockResolvedValue({ id: 'student-1', fullName: 'Juan Pérez' } as never);
    sections.findById.mockResolvedValue(new Section('section-1', 'grade-1', 'Sexto Uno'));
    academicYears.findById.mockResolvedValue(
      new AcademicYear('year-1', '2026', '2026-01-01', '2026-12-01', 'active'),
    );
    periods.findAll.mockResolvedValue([
      new Period('p1', 'year-1', 'Primer periodo', 1, 0.25, '2026-01-20', '2026-03-20'),
      new Period('p2', 'year-1', 'Segundo periodo', 2, 0.25, '2026-03-21', '2026-05-20'),
    ]);
    schedules.findAll.mockResolvedValue([
      new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00'),
    ]);
    subjects.findAll.mockResolvedValue([new Subject('subject-1', 'Biología', 'Ciencias')]);
    evaluations.findAll.mockResolvedValue([
      new Evaluation('eval-1', 'subject-1', 'section-1', 'year-1', 'p1', 'actividad', 5, 'Taller 1'),
    ]);
    scores.findAll.mockResolvedValue([new GradeScore('score-1', 'eval-1', 'enr-1', 4)]);
    recoveries.findAll.mockResolvedValue([]);
    attendance.findAll.mockResolvedValue([
      new AttendanceRecord('att-1', 'enr-1', 'sched-1', '2026-02-10', 'ausente'),
    ]);
    weightConfigRepo.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1, 3.0));
  });

  it('rechaza si la matrícula no existe', async () => {
    enrollments.findById.mockResolvedValue(null);

    await expect(useCase.execute('enr-x', admin)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el usuario no tiene acceso a esa matrícula', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds = jest.fn().mockResolvedValue(new Set(['otra-matricula']));

    await expect(useCase.execute('enr-1', admin)).rejects.toThrow(ForbiddenException);
  });

  it('arma el boletín con una materia, su área, la nota del periodo con datos y "-" en el que no tiene evaluaciones', async () => {
    const result = await useCase.execute('enr-1', admin);

    expect(result.studentName).toBe('Juan Pérez');
    expect(result.sectionName).toBe('Sexto Uno');
    expect(result.subjects).toHaveLength(1);

    const biologia = result.subjects[0];
    expect(biologia.subjectName).toBe('Biología');
    expect(biologia.subjectArea).toBe('Ciencias');
    expect(biologia.periods[0].grade).toBeCloseTo(4, 5);
    expect(biologia.periods[0].isPartial).toBe(true);
    expect(biologia.periods[0].isRecovered).toBe(false);
    expect(biologia.periods[0].absences).toBe(1);
    expect(biologia.periods[1].grade).toBeNull();
    expect(biologia.periods[1].isRecovered).toBe(false);
    expect(biologia.accumulatedGrade).toBeCloseTo(2, 5);
    expect(biologia.accumulatedAbsences).toBe(1);
  });

  it('reemplaza la nota del periodo cuando hay una recuperación registrada', async () => {
    recoveries.findAll.mockResolvedValue([new GradeRecovery('rec-1', 'enr-1', 'subject-1', 'p1', 3.5)]);

    const result = await useCase.execute('enr-1', admin);

    const biologia = result.subjects[0];
    expect(biologia.periods[0].grade).toBe(3.5);
    expect(biologia.periods[0].isPartial).toBe(false);
    expect(biologia.periods[0].isRecovered).toBe(true);
    // Acumulada: (3.5*0.25 + 0*0.25) / 0.5 = 1.75
    expect(biologia.accumulatedGrade).toBeCloseTo(1.75, 5);
  });

  it('una recuperación de un periodo sin nota original no afecta otros periodos', async () => {
    recoveries.findAll.mockResolvedValue([new GradeRecovery('rec-1', 'enr-1', 'subject-1', 'p2', 3.0)]);

    const result = await useCase.execute('enr-1', admin);

    const biologia = result.subjects[0];
    expect(biologia.periods[0].isRecovered).toBe(false);
    expect(biologia.periods[1].grade).toBe(3.0);
    expect(biologia.periods[1].isRecovered).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest get-gradebook.use-case.spec.ts`
Expected: FAIL — el constructor no acepta el nuevo puerto en esa posición, `subjectArea`/`isRecovered` no existen.

- [ ] **Step 3: Implementar**

Reemplazar el contenido completo de `apps/api/src/modules/grading/application/use-cases/get-gradebook.use-case.ts`:

```ts
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { SectionRepositoryPort } from '../../../academic/application/ports/section.repository.port';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { ScheduleRepositoryPort } from '../../../schedule/application/ports/schedule.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeRecoveryRepositoryPort } from '../ports/grade-recovery.repository.port';
import { AttendanceRecordRepositoryPort } from '../../../attendance/application/ports/attendance-record.repository.port';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeCalculationService, EvaluationItem } from '../../domain/services/grade-calculation.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface GradebookPeriodColumn {
  id: string;
  name: string;
  order: number;
  weight: number;
}

export interface GradebookPeriodCell {
  periodId: string;
  grade: number | null;
  isPartial: boolean;
  isRecovered: boolean;
  absences: number;
}

export interface GradebookSubjectRow {
  subjectId: string;
  subjectName: string;
  subjectArea: string;
  periods: GradebookPeriodCell[];
  accumulatedGrade: number;
  accumulatedAbsences: number;
}

export interface GradebookResponse {
  enrollmentId: string;
  studentName: string;
  sectionName: string;
  academicYearName: string;
  periods: GradebookPeriodColumn[];
  subjects: GradebookSubjectRow[];
}

@Injectable()
export class GetGradebookUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    @Inject(SectionRepositoryPort) private readonly sections: SectionRepositoryPort,
    @Inject(SubjectRepositoryPort) private readonly subjects: SubjectRepositoryPort,
    @Inject(AcademicYearRepositoryPort) private readonly academicYears: AcademicYearRepositoryPort,
    @Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort,
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    @Inject(GradeScoreRepositoryPort) private readonly scores: GradeScoreRepositoryPort,
    @Inject(GradeRecoveryRepositoryPort) private readonly recoveries: GradeRecoveryRepositoryPort,
    @Inject(AttendanceRecordRepositoryPort) private readonly attendance: AttendanceRecordRepositoryPort,
    private readonly weightConfigService: GradeWeightConfigService,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(enrollmentId: string, currentUser: JwtPayload): Promise<GradebookResponse> {
    const enrollment = await this.enrollments.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${enrollmentId}"`);
    }

    const allowed = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    if (allowed !== null && !allowed.has(enrollmentId)) {
      throw new ForbiddenException('No tenés acceso al boletín de este estudiante');
    }

    const [
      student,
      section,
      academicYear,
      periodsForYear,
      schedulesForSection,
      allSubjects,
      evaluationsForSection,
      scoresForEnrollment,
      recoveriesForEnrollment,
      attendanceForEnrollment,
      weights,
    ] = await Promise.all([
      this.users.findById(enrollment.studentId),
      this.sections.findById(enrollment.sectionId),
      this.academicYears.findById(enrollment.academicYearId),
      this.periods.findAll({ academicYearId: enrollment.academicYearId }),
      this.schedules.findAll({ sectionId: enrollment.sectionId, academicYearId: enrollment.academicYearId }),
      this.subjects.findAll(),
      this.evaluations.findAll({ sectionId: enrollment.sectionId, academicYearId: enrollment.academicYearId }),
      this.scores.findAll({ enrollmentId }),
      this.recoveries.findAll({ enrollmentId }),
      this.attendance.findAll({ enrollmentId }),
      this.weightConfigService.getOrCreateDefault(),
    ]);

    const sortedPeriods = [...periodsForYear].sort((a, b) => a.order - b.order);
    const scheduleSubjectMap = new Map(schedulesForSection.map((s) => [s.id, s.subjectId]));
    const subjectIds = [...new Set(schedulesForSection.map((s) => s.subjectId))];
    const subjectNameById = new Map(allSubjects.map((s) => [s.id, s.name]));
    const subjectAreaById = new Map(allSubjects.map((s) => [s.id, s.area]));
    const scoreByEvaluationId = new Map(scoresForEnrollment.map((s) => [s.evaluationId, s.score]));
    const recoveryByKey = new Map(
      recoveriesForEnrollment.map((r) => [`${r.subjectId}:${r.periodId}`, r]),
    );

    const absenceRecords = attendanceForEnrollment.filter((r) => r.status === 'ausente');
    const absencesBySubjectPeriod = GradeCalculationService.countAbsencesBySubjectAndPeriod(
      absenceRecords,
      scheduleSubjectMap,
      sortedPeriods.map((p) => ({ id: p.id, startDate: p.startDate, endDate: p.endDate })),
    );

    const subjectRows: GradebookSubjectRow[] = subjectIds
      .map((subjectId) => {
        const subjectEvaluations = evaluationsForSection.filter((e) => e.subjectId === subjectId);

        const periodCells: GradebookPeriodCell[] = sortedPeriods.map((period) => {
          const items: EvaluationItem[] = subjectEvaluations
            .filter((e) => e.periodId === period.id)
            .map((e) => ({
              evaluationId: e.id,
              category: e.category,
              label: e.label,
              maxScore: e.maxScore,
              rawScore: scoreByEvaluationId.get(e.id) ?? null,
            }));
          const { grade, isPartial } = GradeCalculationService.computeSubjectPeriodGrade(items, weights);
          const absences = absencesBySubjectPeriod.get(subjectId)?.get(period.id) ?? 0;

          const recovery = recoveryByKey.get(`${subjectId}:${period.id}`);
          if (recovery) {
            return { periodId: period.id, grade: recovery.score, isPartial: false, isRecovered: true, absences };
          }
          return { periodId: period.id, grade, isPartial, isRecovered: false, absences };
        });

        const accumulatedGrade = GradeCalculationService.computeAccumulatedGrade(
          sortedPeriods.map((period, i) => ({ weight: period.weight, grade: periodCells[i].grade })),
        );
        const accumulatedAbsences = GradeCalculationService.computeAccumulatedAbsences(
          periodCells.map((c) => c.absences),
        );

        return {
          subjectId,
          subjectName: subjectNameById.get(subjectId) ?? subjectId,
          subjectArea: subjectAreaById.get(subjectId) ?? '',
          periods: periodCells,
          accumulatedGrade,
          accumulatedAbsences,
        };
      })
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    return {
      enrollmentId,
      studentName: student?.fullName ?? enrollment.studentId,
      sectionName: section?.name ?? enrollment.sectionId,
      academicYearName: academicYear?.name ?? enrollment.academicYearId,
      periods: sortedPeriods.map((p) => ({ id: p.id, name: p.name, order: p.order, weight: p.weight })),
      subjects: subjectRows,
    };
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest get-gradebook.use-case.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Correr toda la suite de backend**

Run: `cd apps/api && npm test`
Expected: PASS, sin regresiones (el constructor de `GetGradebookUseCase` cambió de orden/cantidad de argumentos — confirmar que no queda ningún otro `new GetGradebookUseCase(...)` manual desactualizado fuera de este spec; NestJS resuelve la inyección real por `providers`, así que solo el spec instancia manualmente).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/grading/application/use-cases/get-gradebook.use-case.ts \
  apps/api/src/modules/grading/application/use-cases/get-gradebook.use-case.spec.ts
git commit -m "feat(grading): aplicar recuperación y exponer área en GetGradebookUseCase"
```

---

## Task 5: Aplicar la recuperación en `GetSubjectPeriodDetailUseCase` + exponer `minPassingGrade`

**Files:**
- Modify: `apps/api/src/modules/grading/application/use-cases/get-subject-period-detail.use-case.ts`
- Modify: `apps/api/src/modules/grading/application/use-cases/get-subject-period-detail.use-case.spec.ts`

**Interfaces:**
- Consumes: `GradeRecoveryRepositoryPort.findByKey(enrollmentId, subjectId, periodId)` (Task 2).
- Produces: `SubjectPeriodDetailResponse.isRecovered: boolean`, `SubjectPeriodDetailResponse.minPassingGrade: number` — consumidos por la Task 7 (frontend: `SubjectPeriodDetailModal`).

- [ ] **Step 1: Actualizar el test existente y agregar los casos de recuperación**

Reemplazar el contenido completo de `apps/api/src/modules/grading/application/use-cases/get-subject-period-detail.use-case.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { GetSubjectPeriodDetailUseCase } from './get-subject-period-detail.use-case';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeRecoveryRepositoryPort } from '../ports/grade-recovery.repository.port';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { Subject } from '../../../academic/domain/entities/subject.entity';
import { Period } from '../../../academic/domain/entities/period.entity';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { GradeRecovery } from '../../domain/entities/grade-recovery.entity';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('GetSubjectPeriodDetailUseCase', () => {
  const enrollments = { findAll: jest.fn(), findById: jest.fn(), findActiveByStudentAndYear: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EnrollmentRepositoryPort>;
  const subjects = { findAll: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<SubjectRepositoryPort>;
  const periods = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<PeriodRepositoryPort>;
  const evaluations = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EvaluationRepositoryPort>;
  const scores = { findAll: jest.fn(), upsertMany: jest.fn() } as unknown as jest.Mocked<GradeScoreRepositoryPort>;
  const recoveries = { findByKey: jest.fn(), findAll: jest.fn(), upsert: jest.fn() } as unknown as jest.Mocked<GradeRecoveryRepositoryPort>;
  const weightConfigRepo = { findFirst: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<GradeWeightConfigRepositoryPort>;
  const weightConfigService = new GradeWeightConfigService(weightConfigRepo);
  const enrollmentAccess = { resolveAccessibleEnrollmentIds: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new GetSubjectPeriodDetailUseCase(
    enrollments,
    subjects,
    periods,
    evaluations,
    scores,
    recoveries,
    weightConfigService,
    enrollmentAccess,
  );

  const enrollment = new Enrollment('enr-1', 'student-1', 'section-1', 'year-1', 'active');
  const admin: JwtPayload = { sub: 'admin-1', roles: ['admin_institucion'], tenantId: 't1' } as JwtPayload;
  const period = new Period('p1', 'year-1', 'Primer periodo', 1, 0.25, '2026-01-20', '2026-03-20');

  beforeEach(() => {
    jest.clearAllMocks();
    enrollments.findById.mockResolvedValue(enrollment);
    enrollmentAccess.resolveAccessibleEnrollmentIds = jest.fn().mockResolvedValue(null);
    periods.findById.mockResolvedValue(period);
    subjects.findAll.mockResolvedValue([new Subject('subject-1', 'Biología', 'Ciencias')]);
    evaluations.findAll.mockResolvedValue([
      new Evaluation('eval-1', 'subject-1', 'section-1', 'year-1', 'p1', 'actividad', 5, 'Taller 1'),
    ]);
    scores.findAll.mockResolvedValue([new GradeScore('score-1', 'eval-1', 'enr-1', 4)]);
    recoveries.findByKey.mockResolvedValue(null);
    weightConfigRepo.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1, 3.0));
  });

  it('rechaza si el periodo no existe o no es de ese año lectivo', async () => {
    periods.findById.mockResolvedValue(null);

    await expect(useCase.execute('enr-1', 'subject-1', 'p-x', admin)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si la materia no existe', async () => {
    subjects.findAll.mockResolvedValue([]);

    await expect(useCase.execute('enr-1', 'subject-x', 'p1', admin)).rejects.toThrow(NotFoundException);
  });

  it('devuelve el desglose por categoría con la evaluación cargada y la nota mínima', async () => {
    const result = await useCase.execute('enr-1', 'subject-1', 'p1', admin);

    expect(result.subjectName).toBe('Biología');
    expect(result.periodName).toBe('Primer periodo');
    expect(result.grade).toBeCloseTo(4, 5);
    expect(result.isPartial).toBe(true);
    expect(result.isRecovered).toBe(false);
    expect(result.minPassingGrade).toBe(3.0);
    const actividad = result.categories.find((c) => c.category === 'actividad')!;
    expect(actividad.items).toEqual([
      { evaluationId: 'eval-1', category: 'actividad', label: 'Taller 1', maxScore: 5, rawScore: 4, normalized: 4 },
    ]);
  });

  it('reemplaza la nota con la de recuperación cuando existe una para esa materia/periodo', async () => {
    recoveries.findByKey.mockResolvedValue(new GradeRecovery('rec-1', 'enr-1', 'subject-1', 'p1', 3.5));

    const result = await useCase.execute('enr-1', 'subject-1', 'p1', admin);

    expect(result.grade).toBe(3.5);
    expect(result.isPartial).toBe(false);
    expect(result.isRecovered).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest get-subject-period-detail.use-case.spec.ts`
Expected: FAIL — el constructor no acepta el nuevo puerto, `isRecovered`/`minPassingGrade` no existen en la respuesta.

- [ ] **Step 3: Implementar**

Reemplazar el contenido completo de `apps/api/src/modules/grading/application/use-cases/get-subject-period-detail.use-case.ts`:

```ts
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeRecoveryRepositoryPort } from '../ports/grade-recovery.repository.port';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import {
  CategoryBreakdown,
  EvaluationItem,
  GradeCalculationService,
} from '../../domain/services/grade-calculation.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface SubjectPeriodDetailResponse {
  subjectId: string;
  subjectName: string;
  periodId: string;
  periodName: string;
  grade: number | null;
  isPartial: boolean;
  isRecovered: boolean;
  minPassingGrade: number;
  categories: CategoryBreakdown[];
}

@Injectable()
export class GetSubjectPeriodDetailUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(SubjectRepositoryPort) private readonly subjects: SubjectRepositoryPort,
    @Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort,
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    @Inject(GradeScoreRepositoryPort) private readonly scores: GradeScoreRepositoryPort,
    @Inject(GradeRecoveryRepositoryPort) private readonly recoveries: GradeRecoveryRepositoryPort,
    private readonly weightConfigService: GradeWeightConfigService,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(
    enrollmentId: string,
    subjectId: string,
    periodId: string,
    currentUser: JwtPayload,
  ): Promise<SubjectPeriodDetailResponse> {
    const enrollment = await this.enrollments.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${enrollmentId}"`);
    }

    const allowed = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    if (allowed !== null && !allowed.has(enrollmentId)) {
      throw new ForbiddenException('No tenés acceso al boletín de este estudiante');
    }

    const period = await this.periods.findById(periodId);
    if (!period || period.academicYearId !== enrollment.academicYearId) {
      throw new NotFoundException(`No existe el periodo "${periodId}" para ese año lectivo`);
    }

    const [allSubjects, subjectEvaluations, scoresForEnrollment, recovery, weights] = await Promise.all([
      this.subjects.findAll(),
      this.evaluations.findAll({
        sectionId: enrollment.sectionId,
        academicYearId: enrollment.academicYearId,
        subjectId,
        periodId,
      }),
      this.scores.findAll({ enrollmentId }),
      this.recoveries.findByKey(enrollmentId, subjectId, periodId),
      this.weightConfigService.getOrCreateDefault(),
    ]);

    const subject = allSubjects.find((s) => s.id === subjectId);
    if (!subject) {
      throw new NotFoundException(`No existe la materia "${subjectId}"`);
    }

    const scoreByEvaluationId = new Map(scoresForEnrollment.map((s) => [s.evaluationId, s.score]));
    const items: EvaluationItem[] = subjectEvaluations.map((e) => ({
      evaluationId: e.id,
      category: e.category,
      label: e.label,
      maxScore: e.maxScore,
      rawScore: scoreByEvaluationId.get(e.id) ?? null,
    }));

    const computed = GradeCalculationService.computeSubjectPeriodGrade(items, weights);
    const grade = recovery ? recovery.score : computed.grade;
    const isPartial = recovery ? false : computed.isPartial;

    return {
      subjectId,
      subjectName: subject.name,
      periodId,
      periodName: period.name,
      grade,
      isPartial,
      isRecovered: recovery !== null,
      minPassingGrade: weights.minPassingGrade,
      categories: computed.categories,
    };
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest get-subject-period-detail.use-case.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Correr toda la suite de backend**

Run: `cd apps/api && npm test`
Expected: PASS, sin regresiones.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/grading/application/use-cases/get-subject-period-detail.use-case.ts \
  apps/api/src/modules/grading/application/use-cases/get-subject-period-detail.use-case.spec.ts
git commit -m "feat(grading): aplicar recuperación y exponer nota mínima en GetSubjectPeriodDetailUseCase"
```

---

## Task 6: Frontend — badge de "recuperada" en `GradebookTable` + tipos compartidos

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify: `apps/web/src/features/grading/components/gradebook-table.tsx`

**Interfaces:**
- Consumes: `GradebookPeriodCell.isRecovered`, `GradebookSubjectRow.subjectArea` (Task 4, ya reflejados en el backend real).

No hay framework de test en `apps/web` — este task se verifica manualmente en el navegador (Step 3).

- [ ] **Step 1: Actualizar los tipos compartidos**

En `packages/shared-types/src/index.ts`, actualizar las interfaces `GradebookPeriodCell` y `GradebookSubjectRow` (alrededor de la línea 503):

```ts
export interface GradebookPeriodCell {
  periodId: string;
  grade: number | null;
  isPartial: boolean;
  isRecovered: boolean;
  absences: number;
}

export interface GradebookSubjectRow {
  subjectId: string;
  subjectName: string;
  subjectArea: string;
  periods: GradebookPeriodCell[];
  accumulatedGrade: number;
  accumulatedAbsences: number;
}
```

- [ ] **Step 2: Agregar el badge en `GradebookTable`**

En `apps/web/src/features/grading/components/gradebook-table.tsx`, dentro del `<td>` que renderiza la celda de nota (tanto la rama `readOnly` como la rama con `<button>` de `onViewDetail`), agregar el badge junto al marcador de `isPartial` existente. Reemplazar el bloque completo del `<td>` de nota:

```tsx
                    <td className="px-2 py-2 text-center">
                      {readOnly ? (
                        <span title={cell.isPartial ? 'Nota parcial: todavía faltan categorías por cargar' : undefined}>
                          {formatGrade(cell.grade)}
                          {cell.isPartial && <span className="text-muted-foreground">·</span>}
                          {cell.isRecovered && (
                            <span
                              className="ml-1 rounded bg-primary/10 px-1 text-[10px] font-semibold text-primary"
                              title="Nota recuperada"
                            >
                              R
                            </span>
                          )}
                        </span>
                      ) : cell.grade === null ? (
                        <button
                          type="button"
                          className="text-muted-foreground underline hover:text-foreground"
                          onClick={() => onCreateGrade?.(subject.subjectId, cell.periodId)}
                        >
                          +
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="underline hover:text-primary"
                          onClick={() => onViewDetail?.(subject.subjectId, cell.periodId)}
                          title={cell.isPartial ? 'Nota parcial: todavía faltan categorías por cargar' : undefined}
                        >
                          {formatGrade(cell.grade)}
                          {cell.isPartial && <span className="text-muted-foreground">·</span>}
                          {cell.isRecovered && (
                            <span
                              className="ml-1 rounded bg-primary/10 px-1 text-[10px] font-semibold text-primary"
                              title="Nota recuperada"
                            >
                              R
                            </span>
                          )}
                        </button>
                      )}
                    </td>
```

- [ ] **Step 3: Verificar manualmente en el navegador**

Levantar el stack (Docker Compose + `npm run dev` en `apps/api` y `apps/web`), loguearse como `admin@colegio-demo.test` / `Demo12345!`, ir a Calificaciones → buscar un estudiante → abrir su boletín. Confirmar que la tabla carga normalmente (sin recuperaciones todavía, no debe verse ningún badge "R"). Este task se termina de verificar visualmente al completar la Task 7, cuando ya se pueda registrar una recuperación desde la UI.

- [ ] **Step 4: Commit**

```bash
git add packages/shared-types/src/index.ts \
  apps/web/src/features/grading/components/gradebook-table.tsx
git commit -m "feat(grading): mostrar badge de nota recuperada en el gradebook"
```

---

## Task 7: Frontend — registrar recuperación desde `SubjectPeriodDetailModal`

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify: `apps/web/src/features/grading/use-gradebook.ts`
- Create: `apps/web/src/app/api/grading/gradebook/[enrollmentId]/recovery/route.ts`
- Modify: `apps/web/src/features/grading/components/subject-period-detail-modal.tsx`

**Interfaces:**
- Consumes: `SubjectPeriodDetailResponse.isRecovered`, `.minPassingGrade` (Task 5), endpoint `POST /grading/gradebook/:enrollmentId/recovery` (Task 3).
- Produces: `useRecordGradeRecovery()` hook, usado únicamente dentro de este componente.

- [ ] **Step 1: Actualizar los tipos compartidos**

En `packages/shared-types/src/index.ts`, actualizar `SubjectPeriodDetailResponse` (alrededor de la línea 543) y agregar `GradeRecovery`:

```ts
export interface SubjectPeriodDetailResponse {
  subjectId: string;
  subjectName: string;
  periodId: string;
  periodName: string;
  grade: number | null;
  isPartial: boolean;
  isRecovered: boolean;
  minPassingGrade: number;
  categories: GradebookCategoryBreakdown[];
}

export interface GradeRecovery {
  id: string;
  enrollmentId: string;
  subjectId: string;
  periodId: string;
  score: number;
}
```

- [ ] **Step 2: Agregar el hook de mutación**

En `apps/web/src/features/grading/use-gradebook.ts`, agregar el import `GradeRecovery` al bloque de `import type`:

```ts
import type {
  GradebookStudentRow,
  GradebookResponse,
  SubjectPeriodDetailResponse,
  CreateGradeInput,
  GradeScore,
  GradeRecovery,
  PaginatedResult,
} from '@eduapp/shared-types';
```

Y agregar al final del archivo:

```ts
export interface RecordGradeRecoveryMutationInput {
  enrollmentId: string;
  subjectId: string;
  periodId: string;
  score: number;
}

async function recordGradeRecovery({
  enrollmentId,
  ...input
}: RecordGradeRecoveryMutationInput): Promise<GradeRecovery> {
  const res = await fetch(`/api/grading/gradebook/${enrollmentId}/recovery`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo registrar la recuperación');
  }
  return res.json();
}

export function useRecordGradeRecovery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordGradeRecovery,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gradebook', variables.enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['gradebook-subject-period', variables.enrollmentId] });
    },
  });
}
```

- [ ] **Step 3: Proxy route de Next.js**

Crear `apps/web/src/app/api/grading/gradebook/[enrollmentId]/recovery/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GradeRecovery } from '@eduapp/shared-types';

export async function POST(req: NextRequest, { params }: { params: { enrollmentId: string } }) {
  const body = await req.json();
  const recovery = await serverApiFetch<GradeRecovery>(`/grading/gradebook/${params.enrollmentId}/recovery`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (recovery === null) {
    return NextResponse.json({ message: 'No se pudo registrar la recuperación' }, { status: 400 });
  }
  return NextResponse.json(recovery, { status: 201 });
}
```

- [ ] **Step 4: Formulario de recuperación en el modal**

Reemplazar el contenido completo de `apps/web/src/features/grading/components/subject-period-detail-modal.tsx`:

```tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSubjectPeriodDetail, useRecordGradeRecovery } from '../use-gradebook';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import type { GradeCategory } from '@eduapp/shared-types';

const CATEGORY_LABELS: Record<GradeCategory, string> = {
  actividad: 'Actividad',
  evaluacion_bimestral: 'Evaluación bimestral',
  disciplina: 'Disciplina',
};

export function SubjectPeriodDetailModal({
  enrollmentId,
  subjectId,
  periodId,
  onClose,
  onAddGrade,
}: {
  enrollmentId: string | null;
  subjectId: string | null;
  periodId: string | null;
  onClose: () => void;
  onAddGrade: () => void;
}) {
  const open = enrollmentId !== null && subjectId !== null && periodId !== null;
  const { data: detail, isLoading, error } = useSubjectPeriodDetail(enrollmentId, subjectId, periodId);
  const recordRecovery = useRecordGradeRecovery();
  const [recoveryScore, setRecoveryScore] = useState('');

  useEffect(() => {
    setRecoveryScore('');
  }, [enrollmentId, subjectId, periodId]);

  function handleRecoverySubmit(event: FormEvent) {
    event.preventDefault();
    if (!enrollmentId || !subjectId || !periodId || recoveryScore.trim() === '') return;
    recordRecovery.mutate(
      { enrollmentId, subjectId, periodId, score: Number(recoveryScore) },
      { onSuccess: () => setRecoveryScore('') },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={detail ? `${detail.subjectName} — ${detail.periodName}` : 'Detalle de la nota'}
    >
      {isLoading && <LoadingState />}
      {error && <p className="text-sm text-destructive">No se pudo cargar el detalle.</p>}
      {detail && (
        <div className="space-y-4">
          <p className="text-sm">
            Nota del periodo:{' '}
            <span className="font-semibold">{detail.grade === null ? '-' : detail.grade.toFixed(2)}</span>
            {detail.isPartial && (
              <span className="ml-2 text-xs text-muted-foreground">
                (parcial — todavía faltan categorías por cargar)
              </span>
            )}
          </p>

          {detail.categories.map((category) => (
            <div key={category.category} className="space-y-1.5 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {CATEGORY_LABELS[category.category]} ({Math.round(category.weight * 100)}%)
                </p>
                <p className="text-sm text-muted-foreground">
                  {category.average === null ? 'Sin notas cargadas' : `Promedio: ${category.average.toFixed(2)}`}
                </p>
              </div>
              {category.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Todavía no hay evaluaciones en esta categoría.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {category.items.map((item) => (
                    <li key={item.evaluationId} className="flex items-center justify-between">
                      <span>{item.label ?? 'Sin nombre'}</span>
                      <span className="text-muted-foreground">
                        {item.rawScore === null ? 'Sin calificar' : `${item.rawScore} / ${item.maxScore}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {detail.isRecovered ? (
            <p className="rounded border border-border bg-muted/40 p-3 text-sm">
              <span className="font-medium">Recuperada</span> — nota registrada:{' '}
              {detail.grade === null ? '-' : detail.grade.toFixed(2)}
            </p>
          ) : (
            detail.grade !== null &&
            detail.grade < detail.minPassingGrade && (
              <form onSubmit={handleRecoverySubmit} className="space-y-2 rounded border border-border p-3">
                <Label htmlFor="recovery-score">Registrar recuperación</Label>
                <div className="flex gap-2">
                  <Input
                    id="recovery-score"
                    type="number"
                    min={0}
                    max={5}
                    step="0.1"
                    required
                    value={recoveryScore}
                    onChange={(e) => setRecoveryScore(e.target.value)}
                  />
                  <Button type="submit" disabled={recordRecovery.isPending}>
                    {recordRecovery.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
                {recordRecovery.isError && (
                  <p className="text-sm text-destructive">{recordRecovery.error.message}</p>
                )}
              </form>
            )
          )}

          <Button type="button" onClick={onAddGrade} className="w-full">
            Agregar nota
          </Button>
        </div>
      )}
    </Dialog>
  );
}
```

- [ ] **Step 5: Verificar manualmente en el navegador**

Con el stack corriendo, ir a Calificaciones → gradebook de un estudiante → hacer clic en una nota de materia/periodo por debajo de 3.0 (cargar una nota baja primero si hace falta, vía "Agregar nota"). Confirmar que aparece el formulario "Registrar recuperación", guardar una nota ≥ 0 y ≤ 5, confirmar que el modal se actualiza mostrando "Recuperada — nota registrada: X", cerrar el modal y confirmar que la tabla del gradebook ahora muestra el badge "R" en esa celda con la nueva nota. Confirmar también que intentar recuperar una materia ya aprobada (nota ≥ 3.0) no muestra el formulario.

- [ ] **Step 6: Commit**

```bash
git add packages/shared-types/src/index.ts \
  apps/web/src/features/grading/use-gradebook.ts \
  apps/web/src/app/api/grading/gradebook/[enrollmentId]/recovery/route.ts \
  apps/web/src/features/grading/components/subject-period-detail-modal.tsx
git commit -m "feat(grading): registrar recuperación desde el detalle de nota"
```

---

## Task 8: `ReportCardPdfGenerator` — tabla única por área con periodos en columnas

**Files:**
- Modify: `apps/api/src/modules/reports/infrastructure/pdf/report-card-pdf-generator.ts`

**Interfaces:**
- Produces: `ReportCardPeriodColumn { periodId, periodName }`, `ReportCardSubjectRow { subjectName, gradeByPeriodId, recoveredPeriodIds, finalGrade }`, `ReportCardAreaGroup { areaName, subjects, averageByPeriodId, finalAverage }`, `ReportCardStudent { studentName, periods, areas }` — consumidos por la Task 9.

No existe un archivo de test para este generador en el código base (el anterior tampoco lo tenía — se verificó siempre generando un PDF real, ver Step 3). Este task no tiene ciclo TDD con Jest; se verifica generando un PDF de prueba con datos hardcodeados.

- [ ] **Step 1: Reemplazar el generador completo**

Reemplazar el contenido completo de `apps/api/src/modules/reports/infrastructure/pdf/report-card-pdf-generator.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface ReportCardPeriodColumn {
  periodId: string;
  periodName: string;
}

export interface ReportCardSubjectRow {
  subjectName: string;
  gradeByPeriodId: Record<string, number | null>;
  recoveredPeriodIds: Set<string>;
  finalGrade: number | null;
}

export interface ReportCardAreaGroup {
  areaName: string;
  subjects: ReportCardSubjectRow[];
  averageByPeriodId: Record<string, number | null>;
  finalAverage: number | null;
}

export interface ReportCardStudent {
  studentName: string;
  periods: ReportCardPeriodColumn[];
  areas: ReportCardAreaGroup[];
}

export interface ReportCardInput {
  institutionName: string;
  institutionColor: string | null;
  institutionLogoPath: string | null;
  sectionName: string;
  academicYearName: string;
  students: ReportCardStudent[];
}

const DEFAULT_ACCENT = '#9184d9';
const MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const SUBJECT_COL_WIDTH = 180;

const INK = '#1f2230';
const MUTED = '#6c7189';
const LINE = '#e6e8f2';
const ROW_ALT = '#f7f8fc';

/**
 * Un boletín por estudiante, todos en el mismo PDF (una página por
 * estudiante vía `addPage()`). Por estudiante: una tabla por área, con los
 * periodos del año lectivo como columnas + "Definitiva" — no se lista el
 * detalle de evaluaciones sueltas, eso queda solo en el gradebook.
 */
@Injectable()
export class ReportCardPdfGenerator {
  private readonly logger = new Logger(ReportCardPdfGenerator.name);

  generate(input: ReportCardInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const accent = input.institutionColor || DEFAULT_ACCENT;

      input.students.forEach((student, index) => {
        if (index > 0) doc.addPage();
        this.renderStudentPage(doc, input, student, accent);
      });

      doc.end();
    });
  }

  private renderStudentPage(
    doc: PDFKit.PDFDocument,
    input: ReportCardInput,
    student: ReportCardStudent,
    accent: string,
  ) {
    let y = this.renderHeader(doc, input, accent);
    y = this.renderStudentCard(doc, input, student, y);

    if (student.areas.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(MUTED)
        .text('Sin notas registradas todavía.', MARGIN, y + 24, { width: CONTENT_WIDTH, align: 'center' });
      this.renderFooter(doc);
      return;
    }

    let hasRecovered = false;
    for (const area of student.areas) {
      const rowCount = area.subjects.length + 1; // + fila de promedio de área
      y = this.ensureSpace(doc, y, 26 + 20 + rowCount * 22 + 14);
      y = this.renderAreaTable(doc, area, student.periods, y, accent);
      y += 14;
      if (area.subjects.some((s) => s.recoveredPeriodIds.size > 0)) hasRecovered = true;
    }

    if (hasRecovered) {
      y = this.ensureSpace(doc, y, 14);
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('(* = recuperada)', MARGIN, y, { width: CONTENT_WIDTH });
    }

    this.renderFooter(doc);
  }

  private renderHeader(doc: PDFKit.PDFDocument, input: ReportCardInput, accent: string): number {
    const bandHeight = 64;
    doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, bandHeight).fill(accent);

    let textX = MARGIN + 16;
    if (input.institutionLogoPath) {
      try {
        doc.image(input.institutionLogoPath, MARGIN + 12, MARGIN + 12, { fit: [40, 40] });
        textX = MARGIN + 64;
      } catch (err) {
        this.logger.warn(`No se pudo incrustar el logo institucional: ${(err as Error).message}`);
      }
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor('#ffffff')
      .text(input.institutionName, textX, MARGIN + 22, { width: 300 });

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#ffffff')
      .text('BOLETÍN DE NOTAS', MARGIN, MARGIN + 26, { width: CONTENT_WIDTH, align: 'right' });

    return MARGIN + bandHeight + 16;
  }

  private renderStudentCard(
    doc: PDFKit.PDFDocument,
    input: ReportCardInput,
    student: ReportCardStudent,
    y: number,
  ): number {
    const cardHeight = 54;
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cardHeight, 8).fill(ROW_ALT);

    const colWidth = CONTENT_WIDTH / 3;
    const columns: [string, string][] = [
      ['ESTUDIANTE', student.studentName],
      ['SECCIÓN', input.sectionName],
      ['AÑO LECTIVO', input.academicYearName],
    ];

    columns.forEach(([label, value], i) => {
      const x = MARGIN + 16 + i * colWidth;
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(label, x, y + 12, { width: colWidth - 20 });
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(INK)
        .text(value, x, y + 26, { width: colWidth - 20, ellipsis: true });
    });

    return y + cardHeight + 20;
  }

  private renderAreaTable(
    doc: PDFKit.PDFDocument,
    area: ReportCardAreaGroup,
    periods: ReportCardPeriodColumn[],
    y: number,
    accent: string,
  ): number {
    doc.rect(MARGIN, y, 4, 18).fill(accent);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(area.areaName, MARGIN + 12, y + 2, {
      width: CONTENT_WIDTH - 12,
    });
    y += 26;

    const dataColsWidth = CONTENT_WIDTH - SUBJECT_COL_WIDTH;
    const colCount = periods.length + 1; // + Definitiva
    const colWidth = dataColsWidth / colCount;

    doc.rect(MARGIN, y, CONTENT_WIDTH, 20).fill(LINE);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED);
    doc.text('MATERIA', MARGIN + 8, y + 6, { width: SUBJECT_COL_WIDTH - 8 });
    periods.forEach((period, i) => {
      doc.text(period.periodName.toUpperCase(), MARGIN + SUBJECT_COL_WIDTH + i * colWidth, y + 6, {
        width: colWidth,
        align: 'center',
      });
    });
    doc.text('DEFINITIVA', MARGIN + SUBJECT_COL_WIDTH + periods.length * colWidth, y + 6, {
      width: colWidth,
      align: 'center',
    });
    let rowY = y + 20;

    area.subjects.forEach((subject, i) => {
      if (i % 2 === 1) doc.rect(MARGIN, rowY, CONTENT_WIDTH, 22).fill(ROW_ALT);

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(INK)
        .text(subject.subjectName, MARGIN + 8, rowY + 6, { width: SUBJECT_COL_WIDTH - 8, ellipsis: true });

      periods.forEach((period, j) => {
        const grade = subject.gradeByPeriodId[period.periodId] ?? null;
        const recovered = subject.recoveredPeriodIds.has(period.periodId);
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(INK)
          .text(this.formatGrade(grade, recovered), MARGIN + SUBJECT_COL_WIDTH + j * colWidth, rowY + 6, {
            width: colWidth,
            align: 'center',
          });
      });

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text(
          this.formatGrade(subject.finalGrade, false),
          MARGIN + SUBJECT_COL_WIDTH + periods.length * colWidth,
          rowY + 6,
          { width: colWidth, align: 'center' },
        );

      rowY += 22;
    });

    doc.rect(MARGIN, rowY, CONTENT_WIDTH, 22).fill(LINE);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(INK)
      .text('Promedio área', MARGIN + 8, rowY + 6, { width: SUBJECT_COL_WIDTH - 8 });
    periods.forEach((period, j) => {
      const avg = area.averageByPeriodId[period.periodId] ?? null;
      doc.text(this.formatGrade(avg, false), MARGIN + SUBJECT_COL_WIDTH + j * colWidth, rowY + 6, {
        width: colWidth,
        align: 'center',
      });
    });
    doc.text(
      this.formatGrade(area.finalAverage, false),
      MARGIN + SUBJECT_COL_WIDTH + periods.length * colWidth,
      rowY + 6,
      { width: colWidth, align: 'center' },
    );
    rowY += 22;

    doc.rect(MARGIN, y, CONTENT_WIDTH, rowY - y).stroke(LINE);
    return rowY;
  }

  private formatGrade(grade: number | null, recovered: boolean): string {
    if (grade === null) return '-';
    return recovered ? `${grade.toFixed(1)}*` : grade.toFixed(1);
  }

  private renderFooter(doc: PDFKit.PDFDocument) {
    const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(`Generado automáticamente por Skolaria el ${today}.`, MARGIN, doc.page.height - MARGIN - 12, {
        width: CONTENT_WIDTH,
        align: 'center',
      });
  }

  /** Si el próximo bloque (encabezado de área + tabla) no entra en lo que queda de página, arranca una nueva. */
  private ensureSpace(doc: PDFKit.PDFDocument, y: number, blockHeight: number): number {
    const bottomLimit = doc.page.height - MARGIN - 24;
    if (y + blockHeight <= bottomLimit) return y;
    doc.addPage();
    return MARGIN;
  }
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd apps/api && npm run build`
Expected: compila sin errores. (La Task 9 es la que deja de compilar temporalmente porque todavía construye el `ReportCardScoreRow` viejo — se corrige en esa misma task.)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/reports/infrastructure/pdf/report-card-pdf-generator.ts
git commit -m "feat(reports): rediseñar el generador del boletín como tabla por área"
```

---

## Task 9: `GenerateReportCardPdfUseCase` — delegar en `GetGradebookUseCase` y agrupar por área

**Files:**
- Modify: `apps/api/src/modules/grading/grading.module.ts`
- Modify: `apps/api/src/modules/reports/application/use-cases/generate-report-card-pdf.use-case.ts`
- Modify: `apps/api/src/modules/reports/application/use-cases/generate-report-card-pdf.use-case.spec.ts`
- Modify: `apps/api/src/modules/reports/interface/controllers/reports.controller.ts`

**Interfaces:**
- Consumes: `GetGradebookUseCase.execute(enrollmentId, currentUser)` (Task 4, con `subjectArea`/`isRecovered`), `ReportCardPeriodColumn`/`ReportCardAreaGroup`/`ReportCardSubjectRow`/`ReportCardStudent` (Task 8).

- [ ] **Step 1: Exportar `GetGradebookUseCase` desde `GradingModule`**

En `apps/api/src/modules/grading/grading.module.ts`, cambiar la línea `exports: [EvaluationRepositoryPort, GradeScoreRepositoryPort],` por:

```ts
  exports: [EvaluationRepositoryPort, GradeScoreRepositoryPort, GetGradebookUseCase],
```

- [ ] **Step 2: Escribir el test que falla**

Reemplazar el contenido completo de `apps/api/src/modules/reports/application/use-cases/generate-report-card-pdf.use-case.spec.ts`:

```ts
import { ForbiddenException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { GetGradebookUseCase, GradebookResponse } from '../../../grading/application/use-cases/get-gradebook.use-case';
import { TenantRegistryService } from '../../../../core/tenant/tenant-registry.service';
import { getCurrentTenant } from '../../../../core/tenant/tenant-context';
import { ReportCardPdfGenerator } from '../../infrastructure/pdf/report-card-pdf-generator';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { GenerateReportCardPdfUseCase } from './generate-report-card-pdf.use-case';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

jest.mock('../../../../core/tenant/tenant-context', () => ({ getCurrentTenant: jest.fn() }));
jest.mock('node:fs', () => ({ existsSync: jest.fn() }));

import { existsSync } from 'node:fs';

describe('GenerateReportCardPdfUseCase', () => {
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
  const getGradebook = { execute: jest.fn() } as unknown as jest.Mocked<GetGradebookUseCase>;
  const pdfGenerator = { generate: jest.fn() } as unknown as jest.Mocked<ReportCardPdfGenerator>;
  const tenantRegistry = { resolveByHost: jest.fn() } as unknown as jest.Mocked<TenantRegistryService>;

  const useCase = new GenerateReportCardPdfUseCase(enrollments, getGradebook, pdfGenerator, tenantRegistry);

  const input = { sectionId: 'section-1', academicYearId: 'year-1' };
  const currentUser: JwtPayload = { sub: 'admin-1', email: 'admin@test.com', roles: ['admin_institucion'], tenantId: 't1' };

  const baseGradebook: GradebookResponse = {
    enrollmentId: 'enr-1',
    studentName: 'Juan Pérez',
    sectionName: 'Sexto Uno',
    academicYearName: '2026',
    periods: [
      { id: 'p1', name: 'Primer periodo', order: 1, weight: 0.5 },
      { id: 'p2', name: 'Segundo periodo', order: 2, weight: 0.5 },
    ],
    subjects: [
      {
        subjectId: 'subj-1',
        subjectName: 'Matemática',
        subjectArea: 'Ciencias',
        periods: [
          { periodId: 'p1', grade: 3.8, isPartial: false, isRecovered: false, absences: 0 },
          { periodId: 'p2', grade: 4.0, isPartial: false, isRecovered: false, absences: 0 },
        ],
        accumulatedGrade: 3.9,
        accumulatedAbsences: 0,
      },
      {
        subjectId: 'subj-2',
        subjectName: 'Física',
        subjectArea: 'Ciencias',
        periods: [
          { periodId: 'p1', grade: 3.4, isPartial: false, isRecovered: true, absences: 0 },
          { periodId: 'p2', grade: null, isPartial: false, isRecovered: false, absences: 0 },
        ],
        accumulatedGrade: 1.7,
        accumulatedAbsences: 0,
      },
      {
        subjectId: 'subj-3',
        subjectName: 'Educación Física',
        subjectArea: '',
        periods: [
          { periodId: 'p1', grade: null, isPartial: false, isRecovered: false, absences: 0 },
          { periodId: 'p2', grade: null, isPartial: false, isRecovered: false, absences: 0 },
        ],
        accumulatedGrade: 0,
        accumulatedAbsences: 0,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentTenant as jest.Mock).mockReturnValue({ subdomain: 'colegio-demo' });
    enrollments.findAll.mockResolvedValue([new Enrollment('enr-1', 'student-1', 'section-1', 'year-1', 'active')]);
    getGradebook.execute.mockResolvedValue(baseGradebook);
    tenantRegistry.resolveByHost.mockResolvedValue({
      id: 't-1',
      name: 'Colegio Demo',
      subdomain: 'colegio-demo',
      customDomain: null,
      schemaName: 'tenant_colegio_demo',
      status: 'active',
      enabledModules: [],
      primaryColor: '#1f8a5c',
      logoUrl: null,
    });
    (existsSync as jest.Mock).mockReturnValue(false);
    pdfGenerator.generate.mockResolvedValue(Buffer.from(''));
  });

  it('pasa currentUser a GetGradebookUseCase por cada matrícula objetivo', async () => {
    await useCase.execute(input, currentUser);

    expect(getGradebook.execute).toHaveBeenCalledWith('enr-1', currentUser);
  });

  it('agrupa las materias por área con una columna por periodo', async () => {
    await useCase.execute(input, currentUser);

    const call = pdfGenerator.generate.mock.calls[0][0];
    const student = call.students[0];
    expect(student.periods).toEqual([
      { periodId: 'p1', periodName: 'Primer periodo' },
      { periodId: 'p2', periodName: 'Segundo periodo' },
    ]);

    const ciencias = student.areas.find((a: { areaName: string }) => a.areaName === 'Ciencias');
    expect(ciencias.subjects).toHaveLength(2);
    const fisica = ciencias.subjects.find((s: { subjectName: string }) => s.subjectName === 'Física');
    expect(fisica.gradeByPeriodId).toEqual({ p1: 3.4, p2: null });
    expect(fisica.recoveredPeriodIds.has('p1')).toBe(true);
    expect(fisica.recoveredPeriodIds.has('p2')).toBe(false);
  });

  it('calcula el promedio de área excluyendo materias sin nota en esa columna', async () => {
    await useCase.execute(input, currentUser);

    const call = pdfGenerator.generate.mock.calls[0][0];
    const ciencias = call.students[0].areas.find((a: { areaName: string }) => a.areaName === 'Ciencias');
    // p1: (3.8 + 3.4) / 2 = 3.6 ; p2: solo Matemática tiene nota -> 4.0
    expect(ciencias.averageByPeriodId.p1).toBeCloseTo(3.6, 5);
    expect(ciencias.averageByPeriodId.p2).toBeCloseTo(4.0, 5);
  });

  it('una materia sin área configurada cae en "Sin área"', async () => {
    await useCase.execute(input, currentUser);

    const call = pdfGenerator.generate.mock.calls[0][0];
    const sinArea = call.students[0].areas.find((a: { areaName: string }) => a.areaName === 'Sin área');
    expect(sinArea.subjects).toHaveLength(1);
    expect(sinArea.subjects[0].subjectName).toBe('Educación Física');
  });

  it('una materia sin ninguna nota en ningún periodo tiene finalGrade null y no arrastra el promedio de área a 0', async () => {
    await useCase.execute(input, currentUser);

    const call = pdfGenerator.generate.mock.calls[0][0];
    const sinArea = call.students[0].areas.find((a: { areaName: string }) => a.areaName === 'Sin área');
    expect(sinArea.subjects[0].finalGrade).toBeNull();
    expect(sinArea.finalAverage).toBeNull();
  });

  it('propaga el ForbiddenException de GetGradebookUseCase cuando el docente no tiene acceso a la sección', async () => {
    getGradebook.execute.mockRejectedValue(new ForbiddenException('No tenés acceso'));

    await expect(useCase.execute(input, currentUser)).rejects.toThrow(ForbiddenException);
  });

  it('pasa el color institucional del tenant al generador (regresión)', async () => {
    await useCase.execute(input, currentUser);

    expect(pdfGenerator.generate).toHaveBeenCalledWith(
      expect.objectContaining({ institutionColor: '#1f8a5c', institutionLogoPath: null }),
    );
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest generate-report-card-pdf.use-case.spec.ts`
Expected: FAIL — el constructor real todavía espera los puertos viejos (`EvaluationRepositoryPort`, etc.), no `GetGradebookUseCase`.

- [ ] **Step 4: Implementar**

Reemplazar el contenido completo de `apps/api/src/modules/reports/application/use-cases/generate-report-card-pdf.use-case.ts`:

```ts
import { existsSync } from 'node:fs';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { GetGradebookUseCase, GradebookResponse, GradebookSubjectRow } from '../../../grading/application/use-cases/get-gradebook.use-case';
import { TenantRegistryService } from '../../../../core/tenant/tenant-registry.service';
import { getCurrentTenant } from '../../../../core/tenant/tenant-context';
import {
  ReportCardAreaGroup,
  ReportCardPdfGenerator,
  ReportCardPeriodColumn,
  ReportCardStudent,
  ReportCardSubjectRow,
} from '../../infrastructure/pdf/report-card-pdf-generator';
import { buildLogoDiskPath } from '../services/resolve-logo-path';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface GenerateReportCardPdfInput {
  sectionId: string;
  academicYearId: string;
  studentIds?: string[];
}

const SIN_AREA = 'Sin área';

/**
 * A diferencia de los documentos emitidos (registro histórico, PDF
 * persistido), el boletín se recalcula al vuelo con las notas actuales y
 * no se guarda en ningún lado — se genera y se devuelve el Buffer directo.
 *
 * Delega todo el cálculo de notas en `GetGradebookUseCase` (el mismo que
 * usan el gradebook del docente y Calificaciones del estudiante) en vez de
 * reimplementarlo — así la recuperación de materias, el acumulado y el
 * chequeo de acceso por matrícula nunca pueden desalinearse entre
 * pantallas. Efecto secundario intencional: un docente sin acceso a la
 * sección ahora recibe `ForbiddenException` acá también.
 */
@Injectable()
export class GenerateReportCardPdfUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    private readonly getGradebook: GetGradebookUseCase,
    private readonly pdfGenerator: ReportCardPdfGenerator,
    private readonly tenantRegistry: TenantRegistryService,
  ) {}

  async execute(input: GenerateReportCardPdfInput, currentUser: JwtPayload): Promise<Buffer> {
    const allEnrollments = await this.enrollments.findAll({
      sectionId: input.sectionId,
      academicYearId: input.academicYearId,
    });
    const targetEnrollments = input.studentIds?.length
      ? allEnrollments.filter((e) => input.studentIds!.includes(e.studentId))
      : allEnrollments;

    if (targetEnrollments.length === 0) {
      throw new NotFoundException('No hay estudiantes matriculados en esa sección/año');
    }

    const { subdomain } = getCurrentTenant();
    const tenant = await this.tenantRegistry.resolveByHost(subdomain);

    // El logo se guarda como URL pública (LocalDiskFileStorage) pero
    // `doc.image()` necesita una ruta de disco real — se resuelve acá y no
    // en el generador, para que este último siga siendo puro pdfkit sin
    // tocar el filesystem. Fallback silencioso: sin logo subido, o archivo
    // borrado a mano, el boletín igual se genera (solo texto).
    let institutionLogoPath: string | null = null;
    if (tenant?.logoUrl) {
      const candidate = buildLogoDiskPath(tenant.logoUrl, process.env.UPLOADS_DIR ?? 'uploads');
      if (existsSync(candidate)) institutionLogoPath = candidate;
    }

    const gradebooks = await Promise.all(
      targetEnrollments.map((enrollment) => this.getGradebook.execute(enrollment.id, currentUser)),
    );

    const students: ReportCardStudent[] = gradebooks.map((gradebook) => this.buildReportCardStudent(gradebook));
    const first = gradebooks[0];

    return this.pdfGenerator.generate({
      institutionName: tenant?.name ?? 'Skolaria',
      institutionColor: tenant?.primaryColor ?? null,
      institutionLogoPath,
      sectionName: first.sectionName,
      academicYearName: first.academicYearName,
      students,
    });
  }

  private buildReportCardStudent(gradebook: GradebookResponse): ReportCardStudent {
    const periods: ReportCardPeriodColumn[] = gradebook.periods.map((p) => ({
      periodId: p.id,
      periodName: p.name,
    }));

    const subjectsByArea = new Map<string, GradebookSubjectRow[]>();
    for (const subject of gradebook.subjects) {
      const areaName = subject.subjectArea.trim() ? subject.subjectArea : SIN_AREA;
      const list = subjectsByArea.get(areaName) ?? [];
      list.push(subject);
      subjectsByArea.set(areaName, list);
    }

    const areas: ReportCardAreaGroup[] = [...subjectsByArea.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([areaName, subjectRows]) => this.buildAreaGroup(areaName, subjectRows, periods));

    return { studentName: gradebook.studentName, periods, areas };
  }

  private buildAreaGroup(
    areaName: string,
    subjectRows: GradebookSubjectRow[],
    periods: ReportCardPeriodColumn[],
  ): ReportCardAreaGroup {
    const subjects: ReportCardSubjectRow[] = subjectRows.map((row) => {
      const allPeriodsNull = row.periods.every((cell) => cell.grade === null);
      return {
        subjectName: row.subjectName,
        gradeByPeriodId: Object.fromEntries(row.periods.map((cell) => [cell.periodId, cell.grade])),
        recoveredPeriodIds: new Set(row.periods.filter((cell) => cell.isRecovered).map((cell) => cell.periodId)),
        finalGrade: allPeriodsNull ? null : row.accumulatedGrade,
      };
    });

    const averageByPeriodId: Record<string, number | null> = {};
    for (const period of periods) {
      const grades = subjects
        .map((s) => s.gradeByPeriodId[period.periodId])
        .filter((g): g is number => g !== null && g !== undefined);
      averageByPeriodId[period.periodId] =
        grades.length === 0 ? null : grades.reduce((sum, g) => sum + g, 0) / grades.length;
    }

    const finals = subjects.map((s) => s.finalGrade).filter((g): g is number => g !== null);
    const finalAverage = finals.length === 0 ? null : finals.reduce((sum, g) => sum + g, 0) / finals.length;

    return { areaName, subjects, averageByPeriodId, finalAverage };
  }
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest generate-report-card-pdf.use-case.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Actualizar el controlador para pasar `currentUser`**

En `apps/api/src/modules/reports/interface/controllers/reports.controller.ts`, agregar los imports:

```ts
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
```

Y reemplazar el método `reportCard`:

```ts
  // Chequea Grading, no Report: un docente genera boletines de su propia
  // sección como tarea normal — mismo criterio que ya tiene para asistencia
  // y calificaciones, no el de reportes institucionales.
  @Get('grading/report-card.pdf')
  @CheckPolicies((ability) => ability.can('manage', 'Grading'))
  async reportCard(
    @Query() query: ReportCardQueryDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.generateReportCardPdf.execute(
      {
        sectionId: query.sectionId,
        academicYearId: query.academicYearId,
        studentIds: query.studentId,
      },
      user,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="boletin.pdf"');
    res.send(buffer);
  }
```

- [ ] **Step 7: Correr toda la suite de backend**

Run: `cd apps/api && npm test`
Expected: PASS, sin regresiones.

- [ ] **Step 8: Verificar generando un PDF real**

Con el stack corriendo (Docker Compose + `npm run dev` en `apps/api`), loguearse vía curl como `admin@colegio-demo.test` / `Demo12345!` contra `POST /auth/login` con el header `x-tenant-subdomain: colegio-demo`, y llamar al endpoint del boletín con el access token, guardando el resultado:

```bash
curl -s -o /tmp/boletin-recuperacion.pdf -w '%{http_code} %{size_download}\n' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-subdomain: colegio-demo" \
  "http://localhost:3001/reports/grading/report-card.pdf?sectionId=$SECTION_ID&academicYearId=$YEAR_ID"
```

Expected: `200` y un tamaño de archivo mayor a cero. Abrir `/tmp/boletin-recuperacion.pdf` y confirmar visualmente: una tabla por área, materias en filas, columnas de periodo + "Definitiva", una fila "Promedio área" por tabla, sin ningún detalle de evaluaciones sueltas. Si hay alguna recuperación cargada durante la Task 7, confirmar que esa celda muestra el asterisco y la leyenda "(* = recuperada)" aparece al pie de la página del estudiante.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/grading/grading.module.ts \
  apps/api/src/modules/reports/application/use-cases/generate-report-card-pdf.use-case.ts \
  apps/api/src/modules/reports/application/use-cases/generate-report-card-pdf.use-case.spec.ts \
  apps/api/src/modules/reports/interface/controllers/reports.controller.ts
git commit -m "refactor(reports): boletín delega en GetGradebookUseCase y se agrupa por área"
```

---

## Verificación final

- [ ] Correr toda la suite de backend una última vez: `cd apps/api && npm test` — debe pasar completo.
- [ ] Correr `cd apps/api && npm run build` y `cd apps/web && npm run build` — ambos deben compilar sin errores de tipos (los tipos de `@eduapp/shared-types` cambiaron en las Tasks 1, 6 y 7).
- [ ] Flujo manual end-to-end: cargar una nota baja a un estudiante → registrar su recuperación desde el modal → confirmar que el gradebook del docente, la vista "Mis calificaciones" del estudiante/acudiente, y el boletín en PDF descargado muestran los tres la misma nota final recuperada, sin discrepancias.
