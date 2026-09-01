# Clases Virtuales (Jitsi Meet) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar que una clase de horario pueda tener videollamada (Jitsi Meet embebido), con permiso de cancelar una fecha puntual sin afectar el resto del horario recurrente.

**Architecture:** Todo se agrega dentro del módulo `schedule` existente (NestJS, Clean Architecture): un campo `isVirtual` en la entidad `Schedule`, una entidad nueva `ClassCancellation` para cancelaciones puntuales, 5 use-cases nuevos, un subject CASL nuevo (`VirtualClass`), y la UI se integra directamente en la vista de Horarios ya existente (`schedule-grid.tsx`/`schedules-list.tsx`). El nombre de sala de Jitsi se deriva determinísticamente del `scheduleId` — no se persiste ningún link.

**Tech Stack:** NestJS + TypeORM + Postgres (backend), Next.js (BFF routes) + React Query (frontend), Jest para specs.

**Spec:** [docs/superpowers/specs/2026-08-25-virtual-classes-design.md](../specs/2026-08-25-virtual-classes-design.md)

## Global Constraints

- Proveedor: `meet.jit.si` (público, gratuito) — sin self-host, sin API keys.
- El link de la sala NUNCA se persiste en la base — se deriva de `tenantId` + `scheduleId` en cada request.
- Permisos: el docente dueño del horario (`schedule.teacherId === currentUser.sub`) o cualquier `directivo`/`admin_institucion` pueden activar/desactivar la clase virtual y cancelar/revertir una fecha puntual. `secretaria`/`estudiante`/`padre_tutor` solo pueden leer (ver el botón "Unirse").
- Solo se puede cancelar una clase que **es virtual** (`isVirtual === true`), cuya fecha coincide con el `dayOfWeek` del horario, y que no sea una fecha pasada.
- Migración siguiente: `1700000000047` (la más alta hoy es `1700000000046-AddChargeUniquenessConstraints`).
- `isUniqueViolation` (código Postgres `23505`) ya existe en `apps/api/src/core/database/postgres-error.util.ts` — no crear uno nuevo.
- Frontend: sin `Dialog`/modal (no existe ese primitivo en este codebase) — usar estado local inline para el flujo de "motivo de cancelación", como ya hacen otras acciones (`enrollments-list.tsx`'s "Dar de baja").
- `Button` (`@/components/ui/button`) solo acepta `variant: 'primary' | 'secondary' | 'ghost'`, sin prop `size` — usar `className` para tamaños compactos.

---

### Task 1: Migración — `schedules.is_virtual` + tabla `class_cancellations`

**Files:**
- Create: `apps/api/src/core/database/migrations/tenant/1700000000047-AddVirtualClassSupport.ts`

**Interfaces:**
- Produces: columna `schedules.is_virtual` (boolean, default false); tabla `class_cancellations(id, schedule_id, date, cancelled_by, reason, created_at)`; índice único `IDX_class_cancellations_schedule_date` sobre `(schedule_id, date)`.

- [ ] **Step 1: Escribir la migración**

```ts
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
```

- [ ] **Step 2: Correr la migración contra la base de dev**

Run: `pnpm --filter @eduapp/api migration:run:tenant:all` (o el script equivalente que ya usa el proyecto para correr migraciones de tenant)
Expected: la migración `AddVirtualClassSupport1700000000047` corre sin error.

- [ ] **Step 3: Verificar la columna y el índice a mano**

Run (conectado a la base de dev, en el schema de un tenant):
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'is_virtual';
SELECT indexname FROM pg_indexes WHERE tablename = 'class_cancellations';
```
Expected: la primera consulta devuelve `is_virtual`; la segunda incluye `IDX_class_cancellations_schedule_date`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/core/database/migrations/tenant/1700000000047-AddVirtualClassSupport.ts
git commit -m "feat(schedule): agregar migracion para clases virtuales y cancelaciones"
```

---

### Task 2: Dominio — `Schedule.isVirtual` + `setVirtual()`

**Files:**
- Modify: `apps/api/src/modules/schedule/domain/entities/schedule.entity.ts`
- Test: `apps/api/src/modules/schedule/domain/entities/schedule.entity.spec.ts` (nuevo)

**Interfaces:**
- Produces: `Schedule` gana un 9° parámetro de constructor `isVirtual: boolean = false` (mutable, no `readonly`) y un método `setVirtual(isVirtual: boolean): void`.

- [ ] **Step 1: Escribir el spec (falla porque `isVirtual`/`setVirtual` no existen todavía)**

```ts
import { Schedule } from './schedule.entity';

describe('Schedule', () => {
  const build = (isVirtual?: boolean) =>
    new Schedule(
      'sched-1',
      'section-1',
      'subject-1',
      'teacher-1',
      'year-1',
      'lunes',
      '08:00',
      '09:00',
      isVirtual,
    );

  it('isVirtual es false por defecto', () => {
    expect(build().isVirtual).toBe(false);
  });

  it('setVirtual activa la clase virtual', () => {
    const schedule = build();
    schedule.setVirtual(true);
    expect(schedule.isVirtual).toBe(true);
  });

  it('setVirtual puede desactivarla de nuevo', () => {
    const schedule = build(true);
    schedule.setVirtual(false);
    expect(schedule.isVirtual).toBe(false);
  });

  it('sigue rechazando startTime >= endTime', () => {
    expect(() => new Schedule('s', 'sec', 'subj', 't', 'y', 'lunes', '10:00', '09:00')).toThrow(
      'La hora de inicio debe ser anterior a la hora de fin',
    );
  });
});
```

- [ ] **Step 2: Correr el spec y confirmar que falla**

Run: `pnpm --filter @eduapp/api test schedule.entity.spec.ts`
Expected: FAIL — `isVirtual`/`setVirtual` no existen en `Schedule`.

- [ ] **Step 3: Implementar**

Reemplazar el contenido de `schedule.entity.ts`:

```ts
export type DayOfWeek = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado';

export class Schedule {
  constructor(
    public readonly id: string,
    public readonly sectionId: string,
    public readonly subjectId: string,
    public readonly teacherId: string,
    public readonly academicYearId: string,
    public readonly dayOfWeek: DayOfWeek,
    public readonly startTime: string,
    public readonly endTime: string,
    public isVirtual: boolean = false,
  ) {
    if (startTime >= endTime) {
      throw new Error('La hora de inicio debe ser anterior a la hora de fin');
    }
  }

  overlaps(other: Schedule): boolean {
    return this.startTime < other.endTime && other.startTime < this.endTime;
  }

  setVirtual(isVirtual: boolean): void {
    this.isVirtual = isVirtual;
  }
}
```

- [ ] **Step 4: Correr el spec y confirmar que pasa**

Run: `pnpm --filter @eduapp/api test schedule.entity.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Correr toda la suite del módulo para confirmar que nada se rompió**

Run: `pnpm --filter @eduapp/api test schedule`
Expected: PASS — `create-schedule` sigue construyendo `Schedule` con 8 argumentos posicionales sin problema (el 9° tiene default).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/schedule/domain/entities/schedule.entity.ts apps/api/src/modules/schedule/domain/entities/schedule.entity.spec.ts
git commit -m "feat(schedule): agregar isVirtual y setVirtual a Schedule"
```

---

### Task 3: Puerto + ORM + repositorio — `findById` y columna `is_virtual`

**Files:**
- Modify: `apps/api/src/modules/schedule/application/ports/schedule.repository.port.ts`
- Modify: `apps/api/src/modules/schedule/infrastructure/entities/schedule.orm-entity.ts`
- Modify: `apps/api/src/modules/schedule/infrastructure/repositories/typeorm-schedule.repository.ts`

**Interfaces:**
- Consumes: `Schedule` con 9° parámetro `isVirtual` (Task 2).
- Produces: `ScheduleRepositoryPort.findById(id: string): Promise<Schedule | null>` — usado por todos los use-cases de las Tasks 6-10.

No hay specs de repositorio TypeORM en este módulo (ni en ningún otro módulo del proyecto — se verifican por build + los specs de use-case que mockean el puerto). Este task se verifica con build y, al final del plan, contra la base de dev real.

- [ ] **Step 1: Agregar `findById` al puerto**

```ts
import { DayOfWeek, Schedule } from '../../domain/entities/schedule.entity';

export interface ScheduleFilter {
  sectionId?: string;
  teacherId?: string;
  academicYearId?: string;
  dayOfWeek?: DayOfWeek;
}

export abstract class ScheduleRepositoryPort {
  abstract findAll(filter?: ScheduleFilter): Promise<Schedule[]>;
  abstract findById(id: string): Promise<Schedule | null>;
  abstract save(schedule: Schedule): Promise<void>;
}
```

- [ ] **Step 2: Agregar la columna al ORM entity**

En `schedule.orm-entity.ts`, agregar después de `endTime`:

```ts
  @Column({ name: 'is_virtual', default: false })
  isVirtual: boolean;
```

- [ ] **Step 3: Implementar `findById` y actualizar `save`/`toDomain` en el repositorio**

Reemplazar el contenido de `typeorm-schedule.repository.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ScheduleFilter, ScheduleRepositoryPort } from '../../application/ports/schedule.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { ScheduleOrmEntity } from '../entities/schedule.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmScheduleRepository extends ScheduleRepositoryPort {
  private readonly repo: Repository<ScheduleOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(ScheduleOrmEntity);
  }

  async findAll(filter?: ScheduleFilter): Promise<Schedule[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.sectionId && { sectionId: filter.sectionId }),
        ...(filter?.teacherId && { teacherId: filter.teacherId }),
        ...(filter?.academicYearId && { academicYearId: filter.academicYearId }),
        ...(filter?.dayOfWeek && { dayOfWeek: filter.dayOfWeek }),
      },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Schedule | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(schedule: Schedule): Promise<void> {
    await this.repo.save({
      id: schedule.id,
      sectionId: schedule.sectionId,
      subjectId: schedule.subjectId,
      teacherId: schedule.teacherId,
      academicYearId: schedule.academicYearId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isVirtual: schedule.isVirtual,
    });
  }

  private toDomain(row: ScheduleOrmEntity): Schedule {
    return new Schedule(
      row.id,
      row.sectionId,
      row.subjectId,
      row.teacherId,
      row.academicYearId,
      row.dayOfWeek,
      row.startTime,
      row.endTime,
      row.isVirtual,
    );
  }
}
```

- [ ] **Step 4: Build**

Run: `pnpm --filter @eduapp/api build`
Expected: sin errores de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/schedule/application/ports/schedule.repository.port.ts apps/api/src/modules/schedule/infrastructure/entities/schedule.orm-entity.ts apps/api/src/modules/schedule/infrastructure/repositories/typeorm-schedule.repository.ts
git commit -m "feat(schedule): agregar findById y persistencia de isVirtual"
```

---

### Task 4: Entidad + puerto + ORM + repositorio — `ClassCancellation`

**Files:**
- Create: `apps/api/src/modules/schedule/domain/entities/class-cancellation.entity.ts`
- Create: `apps/api/src/modules/schedule/application/ports/class-cancellation.repository.port.ts`
- Create: `apps/api/src/modules/schedule/infrastructure/entities/class-cancellation.orm-entity.ts`
- Create: `apps/api/src/modules/schedule/infrastructure/repositories/typeorm-class-cancellation.repository.ts`

**Interfaces:**
- Produces: `ClassCancellation(id, scheduleId, date, cancelledBy, reason)`; `ClassCancellationRepositoryPort` con `findOne`, `findByScheduleIds`, `findById`, `save`, `deleteById` — usados por las Tasks 8-10.

`ClassCancellation` es una entidad sin invariantes propias (todas las validaciones de negocio — fecha futura, día de semana correcto, duplicados — viven en `CancelClassSessionUseCase`, Task 8), igual que `AttendanceRecord` en este mismo codebase: no lleva spec propio.

- [ ] **Step 1: Crear la entidad de dominio**

```ts
export class ClassCancellation {
  constructor(
    public readonly id: string,
    public readonly scheduleId: string,
    public readonly date: string,
    public readonly cancelledBy: string,
    public readonly reason: string | null = null,
  ) {}
}
```

- [ ] **Step 2: Crear el puerto**

```ts
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';

export abstract class ClassCancellationRepositoryPort {
  abstract findOne(scheduleId: string, date: string): Promise<ClassCancellation | null>;
  abstract findByScheduleIds(scheduleIds: string[], from: string, to: string): Promise<ClassCancellation[]>;
  abstract findById(id: string): Promise<ClassCancellation | null>;
  abstract save(cancellation: ClassCancellation): Promise<void>;
  abstract deleteById(id: string): Promise<void>;
}
```

- [ ] **Step 3: Crear el ORM entity**

```ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'class_cancellations' })
export class ClassCancellationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'schedule_id' })
  scheduleId: string;

  @Column({ name: 'date', type: 'date' })
  date: string;

  @Column({ name: 'cancelled_by' })
  cancelledBy: string;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
```

- [ ] **Step 4: Implementar el repositorio TypeORM**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Between, DataSource, In, Repository } from 'typeorm';
import { ClassCancellationRepositoryPort } from '../../application/ports/class-cancellation.repository.port';
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';
import { ClassCancellationOrmEntity } from '../entities/class-cancellation.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmClassCancellationRepository extends ClassCancellationRepositoryPort {
  private readonly repo: Repository<ClassCancellationOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(ClassCancellationOrmEntity);
  }

  async findOne(scheduleId: string, date: string): Promise<ClassCancellation | null> {
    const row = await this.repo.findOne({ where: { scheduleId, date } });
    return row ? this.toDomain(row) : null;
  }

  async findByScheduleIds(scheduleIds: string[], from: string, to: string): Promise<ClassCancellation[]> {
    if (scheduleIds.length === 0) return [];
    const rows = await this.repo.find({
      where: { scheduleId: In(scheduleIds), date: Between(from, to) },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<ClassCancellation | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(cancellation: ClassCancellation): Promise<void> {
    await this.repo.save({
      id: cancellation.id,
      scheduleId: cancellation.scheduleId,
      date: cancellation.date,
      cancelledBy: cancellation.cancelledBy,
      reason: cancellation.reason,
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  private toDomain(row: ClassCancellationOrmEntity): ClassCancellation {
    return new ClassCancellation(row.id, row.scheduleId, row.date, row.cancelledBy, row.reason);
  }
}
```

- [ ] **Step 5: Build**

Run: `pnpm --filter @eduapp/api build`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/schedule/domain/entities/class-cancellation.entity.ts apps/api/src/modules/schedule/application/ports/class-cancellation.repository.port.ts apps/api/src/modules/schedule/infrastructure/entities/class-cancellation.orm-entity.ts apps/api/src/modules/schedule/infrastructure/repositories/typeorm-class-cancellation.repository.ts
git commit -m "feat(schedule): agregar entidad, puerto y repositorio de ClassCancellation"
```

---

### Task 5: Servicio puro — nombre de sala de Jitsi

**Files:**
- Create: `apps/api/src/modules/schedule/application/services/virtual-room-name.ts`
- Test: `apps/api/src/modules/schedule/application/services/virtual-room-name.spec.ts`

**Interfaces:**
- Produces: `buildVirtualRoomName(tenantId: string, scheduleId: string): string` — usado por `GetVirtualRoomUseCase` (Task 7).

- [ ] **Step 1: Escribir el spec (falla porque el archivo no existe)**

```ts
import { buildVirtualRoomName } from './virtual-room-name';

describe('buildVirtualRoomName', () => {
  it('combina tenantId y scheduleId con el prefijo skolaria', () => {
    expect(buildVirtualRoomName('tenant-1', 'sched-1')).toBe('skolaria-tenant-1-sched-1');
  });

  it('es determinístico: el mismo input siempre da el mismo nombre', () => {
    const a = buildVirtualRoomName('tenant-1', 'sched-1');
    const b = buildVirtualRoomName('tenant-1', 'sched-1');
    expect(a).toBe(b);
  });

  it('tenants distintos con el mismo scheduleId no colisionan', () => {
    const a = buildVirtualRoomName('tenant-1', 'sched-1');
    const b = buildVirtualRoomName('tenant-2', 'sched-1');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Correr el spec y confirmar que falla**

Run: `pnpm --filter @eduapp/api test virtual-room-name.spec.ts`
Expected: FAIL — el módulo `./virtual-room-name` no existe.

- [ ] **Step 3: Implementar**

```ts
/**
 * Nombre de sala de Jitsi Meet derivado del `scheduleId` — determinístico
 * y sin persistir ningún link. Se incluye el `tenantId` para que dos
 * tenants nunca puedan colisionar en el mismo nombre de sala pública en
 * meet.jit.si.
 */
export function buildVirtualRoomName(tenantId: string, scheduleId: string): string {
  return `skolaria-${tenantId}-${scheduleId}`;
}
```

- [ ] **Step 4: Correr el spec y confirmar que pasa**

Run: `pnpm --filter @eduapp/api test virtual-room-name.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/schedule/application/services/virtual-room-name.ts apps/api/src/modules/schedule/application/services/virtual-room-name.spec.ts
git commit -m "feat(schedule): agregar generador determinístico de nombre de sala Jitsi"
```

---

### Task 6: Use-case — `SetScheduleVirtualUseCase`

**Files:**
- Create: `apps/api/src/modules/schedule/application/use-cases/set-schedule-virtual.use-case.ts`
- Test: `apps/api/src/modules/schedule/application/use-cases/set-schedule-virtual.use-case.spec.ts`

**Interfaces:**
- Consumes: `ScheduleRepositoryPort` (Task 3), `JwtPayload` (`sub`, `roles`).
- Produces: `SetScheduleVirtualUseCase.execute(scheduleId: string, isVirtual: boolean, currentUser: JwtPayload): Promise<Schedule>` — usado por el controller (Task 12).

- [ ] **Step 1: Escribir el spec (falla porque el use-case no existe)**

```ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SetScheduleVirtualUseCase } from './set-schedule-virtual.use-case';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('SetScheduleVirtualUseCase', () => {
  const schedules: jest.Mocked<ScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new SetScheduleVirtualUseCase(schedules);

  const schedule = () =>
    new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00');

  function user(overrides: Partial<JwtPayload> = {}): JwtPayload {
    return { sub: 'teacher-1', email: 't@x.com', roles: ['docente'], tenantId: 't1', ...overrides };
  }

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si el horario no existe', async () => {
    schedules.findById.mockResolvedValue(null);
    await expect(useCase.execute('sched-1', true, user())).rejects.toThrow(NotFoundException);
  });

  it('lanza ForbiddenException si el actor no es ni el docente dueño ni un directivo/admin', async () => {
    schedules.findById.mockResolvedValue(schedule());
    await expect(
      useCase.execute('sched-1', true, user({ sub: 'otro-docente', roles: ['docente'] })),
    ).rejects.toThrow(ForbiddenException);
    expect(schedules.save).not.toHaveBeenCalled();
  });

  it('el docente dueño puede activar su propia clase virtual', async () => {
    schedules.findById.mockResolvedValue(schedule());
    const result = await useCase.execute('sched-1', true, user());
    expect(result.isVirtual).toBe(true);
    expect(schedules.save).toHaveBeenCalledWith(expect.objectContaining({ isVirtual: true }));
  });

  it('un directivo puede activar la clase virtual de cualquier docente', async () => {
    schedules.findById.mockResolvedValue(schedule());
    const result = await useCase.execute('sched-1', true, user({ sub: 'director-1', roles: ['directivo'] }));
    expect(result.isVirtual).toBe(true);
  });

  it('puede desactivarla de nuevo', async () => {
    const existing = schedule();
    existing.setVirtual(true);
    schedules.findById.mockResolvedValue(existing);
    const result = await useCase.execute('sched-1', false, user());
    expect(result.isVirtual).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el spec y confirmar que falla**

Run: `pnpm --filter @eduapp/api test set-schedule-virtual.use-case.spec.ts`
Expected: FAIL — el módulo `./set-schedule-virtual.use-case` no existe.

- [ ] **Step 3: Implementar**

```ts
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

const MANAGER_ROLES = ['admin_institucion', 'directivo'];

@Injectable()
export class SetScheduleVirtualUseCase {
  constructor(@Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort) {}

  async execute(scheduleId: string, isVirtual: boolean, currentUser: JwtPayload): Promise<Schedule> {
    const schedule = await this.schedules.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException(`No existe el horario "${scheduleId}"`);
    }

    const isOwner = schedule.teacherId === currentUser.sub;
    const isManager = currentUser.roles.some((role) => MANAGER_ROLES.includes(role));
    if (!isOwner && !isManager) {
      throw new ForbiddenException('Solo el docente asignado o un directivo pueden gestionar esta clase');
    }

    schedule.setVirtual(isVirtual);
    await this.schedules.save(schedule);
    return schedule;
  }
}
```

- [ ] **Step 4: Correr el spec y confirmar que pasa**

Run: `pnpm --filter @eduapp/api test set-schedule-virtual.use-case.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/schedule/application/use-cases/set-schedule-virtual.use-case.ts apps/api/src/modules/schedule/application/use-cases/set-schedule-virtual.use-case.spec.ts
git commit -m "feat(schedule): agregar SetScheduleVirtualUseCase"
```

---

### Task 7: Use-case — `GetVirtualRoomUseCase`

**Files:**
- Create: `apps/api/src/modules/schedule/application/use-cases/get-virtual-room.use-case.ts`
- Test: `apps/api/src/modules/schedule/application/use-cases/get-virtual-room.use-case.spec.ts`

**Interfaces:**
- Consumes: `ScheduleRepositoryPort` (Task 3), `buildVirtualRoomName` (Task 5).
- Produces: `GetVirtualRoomUseCase.execute(scheduleId: string, currentUser: JwtPayload): Promise<{ roomName: string; roomUrl: string }>` — usado por el controller (Task 12) y consumido por el frontend como `VirtualRoom` (Task 13).

- [ ] **Step 1: Escribir el spec (falla porque el use-case no existe)**

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GetVirtualRoomUseCase } from './get-virtual-room.use-case';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('GetVirtualRoomUseCase', () => {
  const schedules: jest.Mocked<ScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new GetVirtualRoomUseCase(schedules);

  const user: JwtPayload = { sub: 'teacher-1', email: 't@x.com', roles: ['docente'], tenantId: 'tenant-1' };

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si el horario no existe', async () => {
    schedules.findById.mockResolvedValue(null);
    await expect(useCase.execute('sched-1', user)).rejects.toThrow(NotFoundException);
  });

  it('lanza BadRequestException si el horario no es virtual', async () => {
    const schedule = new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00');
    schedules.findById.mockResolvedValue(schedule);
    await expect(useCase.execute('sched-1', user)).rejects.toThrow(BadRequestException);
  });

  it('devuelve el nombre y la url de la sala derivados de tenantId+scheduleId', async () => {
    const schedule = new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00', true);
    schedules.findById.mockResolvedValue(schedule);

    const result = await useCase.execute('sched-1', user);

    expect(result.roomName).toBe('skolaria-tenant-1-sched-1');
    expect(result.roomUrl).toBe('https://meet.jit.si/skolaria-tenant-1-sched-1');
  });
});
```

- [ ] **Step 2: Correr el spec y confirmar que falla**

Run: `pnpm --filter @eduapp/api test get-virtual-room.use-case.spec.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

```ts
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { buildVirtualRoomName } from '../services/virtual-room-name';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface VirtualRoomResult {
  roomName: string;
  roomUrl: string;
}

@Injectable()
export class GetVirtualRoomUseCase {
  constructor(@Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort) {}

  async execute(scheduleId: string, currentUser: JwtPayload): Promise<VirtualRoomResult> {
    const schedule = await this.schedules.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException(`No existe el horario "${scheduleId}"`);
    }
    if (!schedule.isVirtual) {
      throw new BadRequestException('Esta clase no tiene videollamada habilitada');
    }

    const roomName = buildVirtualRoomName(currentUser.tenantId, schedule.id);
    return { roomName, roomUrl: `https://meet.jit.si/${roomName}` };
  }
}
```

- [ ] **Step 4: Correr el spec y confirmar que pasa**

Run: `pnpm --filter @eduapp/api test get-virtual-room.use-case.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/schedule/application/use-cases/get-virtual-room.use-case.ts apps/api/src/modules/schedule/application/use-cases/get-virtual-room.use-case.spec.ts
git commit -m "feat(schedule): agregar GetVirtualRoomUseCase"
```

---

### Task 8: Use-case — `CancelClassSessionUseCase`

**Files:**
- Create: `apps/api/src/modules/schedule/application/use-cases/cancel-class-session.use-case.ts`
- Test: `apps/api/src/modules/schedule/application/use-cases/cancel-class-session.use-case.spec.ts`

**Interfaces:**
- Consumes: `ScheduleRepositoryPort` (Task 3), `ClassCancellationRepositoryPort` (Task 4), `isUniqueViolation` (ya existe en `core/database/postgres-error.util.ts`).
- Produces: `CancelClassSessionUseCase.execute(input: { scheduleId: string; date: string; reason?: string }, currentUser: JwtPayload): Promise<ClassCancellation>` — usado por el controller (Task 12).

- [ ] **Step 1: Escribir el spec (falla porque el use-case no existe)**

```ts
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CancelClassSessionUseCase } from './cancel-class-session.use-case';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../ports/class-cancellation.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('CancelClassSessionUseCase', () => {
  const schedules: jest.Mocked<ScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const cancellations: jest.Mocked<ClassCancellationRepositoryPort> = {
    findOne: jest.fn(),
    findByScheduleIds: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };

  const useCase = new CancelClassSessionUseCase(schedules, cancellations);

  function virtualSchedule(dayOfWeek: Schedule['dayOfWeek'] = 'lunes') {
    const schedule = new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', dayOfWeek, '08:00', '09:00');
    schedule.setVirtual(true);
    return schedule;
  }

  function user(overrides: Partial<JwtPayload> = {}): JwtPayload {
    return { sub: 'teacher-1', email: 't@x.com', roles: ['docente'], tenantId: 't1', ...overrides };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    // 2026-08-24 es lunes — fija "hoy" para las validaciones de fecha.
    jest.useFakeTimers().setSystemTime(new Date('2026-08-24T12:00:00'));
  });

  afterEach(() => jest.useRealTimers());

  it('lanza NotFoundException si el horario no existe', async () => {
    schedules.findById.mockResolvedValue(null);
    await expect(useCase.execute({ scheduleId: 'sched-1', date: '2026-08-24' }, user())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lanza BadRequestException si el horario no es virtual', async () => {
    const schedule = new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00');
    schedules.findById.mockResolvedValue(schedule);
    await expect(useCase.execute({ scheduleId: 'sched-1', date: '2026-08-24' }, user())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza ForbiddenException si el actor no es el docente dueño ni un directivo/admin', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule());
    await expect(
      useCase.execute(
        { scheduleId: 'sched-1', date: '2026-08-24' },
        user({ sub: 'otro-docente', roles: ['docente'] }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lanza BadRequestException si la fecha no corresponde al día del horario', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule('lunes'));
    // 2026-08-25 es martes
    await expect(useCase.execute({ scheduleId: 'sched-1', date: '2026-08-25' }, user())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza BadRequestException si la fecha ya pasó', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule('lunes'));
    // 2026-08-17 es lunes, pero anterior a "hoy" (2026-08-24)
    await expect(useCase.execute({ scheduleId: 'sched-1', date: '2026-08-17' }, user())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza ConflictException si ya existe una cancelación para esa fecha', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule('lunes'));
    cancellations.findOne.mockResolvedValue(new ClassCancellation('c-1', 'sched-1', '2026-08-24', 'teacher-1'));
    await expect(useCase.execute({ scheduleId: 'sched-1', date: '2026-08-24' }, user())).rejects.toThrow(
      ConflictException,
    );
    expect(cancellations.save).not.toHaveBeenCalled();
  });

  it('el docente dueño puede cancelar la clase de hoy con un motivo', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule('lunes'));
    cancellations.findOne.mockResolvedValue(null);

    const result = await useCase.execute(
      { scheduleId: 'sched-1', date: '2026-08-24', reason: 'Feriado institucional' },
      user(),
    );

    expect(result.reason).toBe('Feriado institucional');
    expect(cancellations.save).toHaveBeenCalledTimes(1);
  });

  it('un directivo puede cancelar la clase de un docente que no es el suyo', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule('lunes'));
    cancellations.findOne.mockResolvedValue(null);

    await useCase.execute({ scheduleId: 'sched-1', date: '2026-08-24' }, user({ sub: 'director-1', roles: ['directivo'] }));

    expect(cancellations.save).toHaveBeenCalledTimes(1);
  });

  it('traduce isUniqueViolation (condición de carrera) a ConflictException', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule('lunes'));
    cancellations.findOne.mockResolvedValue(null);
    cancellations.save.mockRejectedValue({ code: '23505' });

    await expect(useCase.execute({ scheduleId: 'sched-1', date: '2026-08-24' }, user())).rejects.toThrow(
      ConflictException,
    );
  });
});
```

- [ ] **Step 2: Correr el spec y confirmar que falla**

Run: `pnpm --filter @eduapp/api test cancel-class-session.use-case.spec.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

```ts
import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../ports/class-cancellation.repository.port';
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';
import { DayOfWeek } from '../../domain/entities/schedule.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { isUniqueViolation } from '../../../../core/database/postgres-error.util';

const MANAGER_ROLES = ['admin_institucion', 'directivo'];
const DUPLICATE_MESSAGE = 'Ya existe una cancelación registrada para esa fecha';

const DAYS_BY_INDEX: (DayOfWeek | null)[] = [null, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function dayOfWeekOf(date: string): DayOfWeek | null {
  return DAYS_BY_INDEX[new Date(`${date}T00:00:00`).getDay()];
}

function todayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface CancelClassSessionInput {
  scheduleId: string;
  date: string;
  reason?: string;
}

@Injectable()
export class CancelClassSessionUseCase {
  constructor(
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
    @Inject(ClassCancellationRepositoryPort) private readonly cancellations: ClassCancellationRepositoryPort,
  ) {}

  async execute(input: CancelClassSessionInput, currentUser: JwtPayload): Promise<ClassCancellation> {
    const schedule = await this.schedules.findById(input.scheduleId);
    if (!schedule) {
      throw new NotFoundException(`No existe el horario "${input.scheduleId}"`);
    }
    if (!schedule.isVirtual) {
      throw new BadRequestException('Esta clase no tiene videollamada habilitada');
    }

    const isOwner = schedule.teacherId === currentUser.sub;
    const isManager = currentUser.roles.some((role) => MANAGER_ROLES.includes(role));
    if (!isOwner && !isManager) {
      throw new ForbiddenException('Solo el docente asignado o un directivo pueden cancelar esta clase');
    }

    if (dayOfWeekOf(input.date) !== schedule.dayOfWeek) {
      throw new BadRequestException('Esa fecha no corresponde al día de este horario');
    }
    if (input.date < todayLocalDate()) {
      throw new BadRequestException('No se puede cancelar una clase que ya pasó');
    }

    const existing = await this.cancellations.findOne(input.scheduleId, input.date);
    if (existing) {
      throw new ConflictException(DUPLICATE_MESSAGE);
    }

    const cancellation = new ClassCancellation(
      randomUUID(),
      input.scheduleId,
      input.date,
      currentUser.sub,
      input.reason ?? null,
    );

    try {
      await this.cancellations.save(cancellation);
    } catch (err) {
      // Defensa en profundidad: el `findOne` de arriba tiene una ventana de
      // carrera; el índice único de la migración 1700000000047 la cierra a
      // nivel de base, acá solo se traduce el error crudo al mismo 409.
      if (isUniqueViolation(err)) {
        throw new ConflictException(DUPLICATE_MESSAGE);
      }
      throw err;
    }

    return cancellation;
  }
}
```

- [ ] **Step 4: Correr el spec y confirmar que pasa**

Run: `pnpm --filter @eduapp/api test cancel-class-session.use-case.spec.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/schedule/application/use-cases/cancel-class-session.use-case.ts apps/api/src/modules/schedule/application/use-cases/cancel-class-session.use-case.spec.ts
git commit -m "feat(schedule): agregar CancelClassSessionUseCase"
```

---

### Task 9: Use-case — `UncancelClassSessionUseCase`

**Files:**
- Create: `apps/api/src/modules/schedule/application/use-cases/uncancel-class-session.use-case.ts`
- Test: `apps/api/src/modules/schedule/application/use-cases/uncancel-class-session.use-case.spec.ts`

**Interfaces:**
- Consumes: `ClassCancellationRepositoryPort` (Task 4), `ScheduleRepositoryPort` (Task 3).
- Produces: `UncancelClassSessionUseCase.execute(cancellationId: string, currentUser: JwtPayload): Promise<void>` — usado por el controller (Task 12).

- [ ] **Step 1: Escribir el spec (falla porque el use-case no existe)**

```ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UncancelClassSessionUseCase } from './uncancel-class-session.use-case';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../ports/class-cancellation.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('UncancelClassSessionUseCase', () => {
  const cancellations: jest.Mocked<ClassCancellationRepositoryPort> = {
    findOne: jest.fn(),
    findByScheduleIds: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };
  const schedules: jest.Mocked<ScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new UncancelClassSessionUseCase(cancellations, schedules);

  function user(overrides: Partial<JwtPayload> = {}): JwtPayload {
    return { sub: 'teacher-1', email: 't@x.com', roles: ['docente'], tenantId: 't1', ...overrides };
  }

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si la cancelación no existe', async () => {
    cancellations.findById.mockResolvedValue(null);
    await expect(useCase.execute('c-1', user())).rejects.toThrow(NotFoundException);
  });

  it('lanza ForbiddenException si el actor no es el docente dueño ni un directivo/admin', async () => {
    cancellations.findById.mockResolvedValue(new ClassCancellation('c-1', 'sched-1', '2026-08-24', 'teacher-1'));
    schedules.findById.mockResolvedValue(
      new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00'),
    );
    await expect(useCase.execute('c-1', user({ sub: 'otro-docente', roles: ['docente'] }))).rejects.toThrow(
      ForbiddenException,
    );
    expect(cancellations.deleteById).not.toHaveBeenCalled();
  });

  it('el docente dueño puede revertir su propia cancelación', async () => {
    cancellations.findById.mockResolvedValue(new ClassCancellation('c-1', 'sched-1', '2026-08-24', 'teacher-1'));
    schedules.findById.mockResolvedValue(
      new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00'),
    );

    await useCase.execute('c-1', user());

    expect(cancellations.deleteById).toHaveBeenCalledWith('c-1');
  });

  it('un directivo puede revertir la cancelación de un docente que no es el suyo', async () => {
    cancellations.findById.mockResolvedValue(new ClassCancellation('c-1', 'sched-1', '2026-08-24', 'teacher-1'));
    schedules.findById.mockResolvedValue(
      new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00'),
    );

    await useCase.execute('c-1', user({ sub: 'director-1', roles: ['directivo'] }));

    expect(cancellations.deleteById).toHaveBeenCalledWith('c-1');
  });
});
```

- [ ] **Step 2: Correr el spec y confirmar que falla**

Run: `pnpm --filter @eduapp/api test uncancel-class-session.use-case.spec.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

```ts
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../ports/class-cancellation.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

const MANAGER_ROLES = ['admin_institucion', 'directivo'];

@Injectable()
export class UncancelClassSessionUseCase {
  constructor(
    @Inject(ClassCancellationRepositoryPort) private readonly cancellations: ClassCancellationRepositoryPort,
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
  ) {}

  async execute(cancellationId: string, currentUser: JwtPayload): Promise<void> {
    const cancellation = await this.cancellations.findById(cancellationId);
    if (!cancellation) {
      throw new NotFoundException(`No existe la cancelación "${cancellationId}"`);
    }

    const schedule = await this.schedules.findById(cancellation.scheduleId);
    if (!schedule) {
      throw new NotFoundException(`No existe el horario "${cancellation.scheduleId}"`);
    }

    const isOwner = schedule.teacherId === currentUser.sub;
    const isManager = currentUser.roles.some((role) => MANAGER_ROLES.includes(role));
    if (!isOwner && !isManager) {
      throw new ForbiddenException('Solo el docente asignado o un directivo pueden revertir esta cancelación');
    }

    await this.cancellations.deleteById(cancellationId);
  }
}
```

- [ ] **Step 4: Correr el spec y confirmar que pasa**

Run: `pnpm --filter @eduapp/api test uncancel-class-session.use-case.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/schedule/application/use-cases/uncancel-class-session.use-case.ts apps/api/src/modules/schedule/application/use-cases/uncancel-class-session.use-case.spec.ts
git commit -m "feat(schedule): agregar UncancelClassSessionUseCase"
```

---

### Task 10: Use-case — `ListClassCancellationsUseCase`

**Files:**
- Create: `apps/api/src/modules/schedule/application/use-cases/list-class-cancellations.use-case.ts`
- Test: `apps/api/src/modules/schedule/application/use-cases/list-class-cancellations.use-case.spec.ts`

**Interfaces:**
- Consumes: `ScheduleRepositoryPort` (Task 3), `ClassCancellationRepositoryPort` (Task 4).
- Produces: `ListClassCancellationsUseCase.execute(input: { sectionId?: string; teacherId?: string; from: string; to: string }): Promise<ClassCancellation[]>` — usado por el controller (Task 12).

- [ ] **Step 1: Escribir el spec (falla porque el use-case no existe)**

```ts
import { ListClassCancellationsUseCase } from './list-class-cancellations.use-case';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../ports/class-cancellation.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';

describe('ListClassCancellationsUseCase', () => {
  const schedules: jest.Mocked<ScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const cancellations: jest.Mocked<ClassCancellationRepositoryPort> = {
    findOne: jest.fn(),
    findByScheduleIds: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };

  const useCase = new ListClassCancellationsUseCase(schedules, cancellations);

  beforeEach(() => jest.clearAllMocks());

  it('resuelve los horarios que matchean el filtro y busca sus cancelaciones por id', async () => {
    schedules.findAll.mockResolvedValue([
      new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00'),
      new Schedule('sched-2', 'section-1', 'subject-2', 'teacher-2', 'year-1', 'martes', '08:00', '09:00'),
    ]);
    cancellations.findByScheduleIds.mockResolvedValue([
      new ClassCancellation('c-1', 'sched-1', '2026-08-24', 'teacher-1'),
    ]);

    const result = await useCase.execute({ sectionId: 'section-1', from: '2026-08-24', to: '2026-08-30' });

    expect(schedules.findAll).toHaveBeenCalledWith({ sectionId: 'section-1' });
    expect(cancellations.findByScheduleIds).toHaveBeenCalledWith(['sched-1', 'sched-2'], '2026-08-24', '2026-08-30');
    expect(result).toHaveLength(1);
  });

  it('filtra por teacherId cuando se pasa en vez de sectionId', async () => {
    schedules.findAll.mockResolvedValue([]);
    cancellations.findByScheduleIds.mockResolvedValue([]);

    await useCase.execute({ teacherId: 'teacher-1', from: '2026-08-24', to: '2026-08-30' });

    expect(schedules.findAll).toHaveBeenCalledWith({ teacherId: 'teacher-1' });
  });
});
```

- [ ] **Step 2: Correr el spec y confirmar que falla**

Run: `pnpm --filter @eduapp/api test list-class-cancellations.use-case.spec.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ScheduleFilter, ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../ports/class-cancellation.repository.port';
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';

export interface ListClassCancellationsInput {
  sectionId?: string;
  teacherId?: string;
  from: string;
  to: string;
}

@Injectable()
export class ListClassCancellationsUseCase {
  constructor(
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
    @Inject(ClassCancellationRepositoryPort) private readonly cancellations: ClassCancellationRepositoryPort,
  ) {}

  async execute(input: ListClassCancellationsInput): Promise<ClassCancellation[]> {
    const filter: ScheduleFilter = {};
    if (input.sectionId) filter.sectionId = input.sectionId;
    if (input.teacherId) filter.teacherId = input.teacherId;

    const matchingSchedules = await this.schedules.findAll(filter);
    const scheduleIds = matchingSchedules.map((schedule) => schedule.id);

    return this.cancellations.findByScheduleIds(scheduleIds, input.from, input.to);
  }
}
```

- [ ] **Step 4: Correr el spec y confirmar que pasa**

Run: `pnpm --filter @eduapp/api test list-class-cancellations.use-case.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/schedule/application/use-cases/list-class-cancellations.use-case.ts apps/api/src/modules/schedule/application/use-cases/list-class-cancellations.use-case.spec.ts
git commit -m "feat(schedule): agregar ListClassCancellationsUseCase"
```

---

### Task 11: CASL — subject `VirtualClass`

**Files:**
- Modify: `apps/api/src/core/auth/casl/ability.ts`
- Modify: `apps/api/src/core/auth/casl/ability.factory.ts`
- Modify: `apps/api/src/core/auth/casl/ability.factory.spec.ts`

**Interfaces:**
- Produces: subject CASL `'VirtualClass'` — `directivo`/`admin_institucion`: `manage`; `docente`: `manage` (el use-case acota a sus propias clases); `secretaria`/`estudiante`/`padre_tutor`: `read`. Usado por `@CheckPolicies` en el controller (Task 12).

- [ ] **Step 1: Escribir los tests nuevos en `ability.factory.spec.ts` (fallan porque `'VirtualClass'` no es un subject válido todavía)**

Agregar al final del archivo, antes del cierre de `describe`:

```ts
  it('directivo puede manage VirtualClass', () => {
    const ability = factory.createForUser(payload(['directivo']));
    expect(ability.can('manage', 'VirtualClass')).toBe(true);
  });

  it('docente puede manage VirtualClass (el use-case acota a sus propias clases)', () => {
    const ability = factory.createForUser(payload(['docente']));
    expect(ability.can('manage', 'VirtualClass')).toBe(true);
  });

  it('secretaria/estudiante/padre_tutor solo pueden read VirtualClass', () => {
    expect(factory.createForUser(payload(['secretaria'])).can('read', 'VirtualClass')).toBe(true);
    expect(factory.createForUser(payload(['secretaria'])).can('manage', 'VirtualClass')).toBe(false);
    expect(factory.createForUser(payload(['estudiante'])).can('read', 'VirtualClass')).toBe(true);
    expect(factory.createForUser(payload(['padre_tutor'])).can('read', 'VirtualClass')).toBe(true);
  });
```

- [ ] **Step 2: Correr los specs y confirmar que fallan**

Run: `pnpm --filter @eduapp/api test ability.factory.spec.ts`
Expected: FAIL — TypeScript rechaza `'VirtualClass'` como subject (no está en `AppSubjects`).

- [ ] **Step 3: Agregar el subject al tipo**

En `ability.ts`, agregar `'VirtualClass'` a `AppSubjects` (justo después de `'Schedule'`):

```ts
export type AppSubjects =
  | 'AcademicYear'
  | 'Grade'
  | 'Section'
  | 'Subject'
  | 'User'
  | 'Enrollment'
  | 'Attendance'
  | 'Grading'
  | 'Schedule'
  | 'VirtualClass'
  | 'Finance'
  | 'Hr'
  | 'Document'
  | 'Announcement'
  | 'Event'
  | 'Message'
  | 'Survey'
  | 'SurveyResponse'
  | 'GuardianLink'
  | 'Book'
  | 'Loan'
  | 'Report'
  | 'all';
```

- [ ] **Step 4: Otorgar los permisos en `AbilityFactory`**

En `ability.factory.ts`, agregar `'VirtualClass'` al array de `directivo` (justo después de `'Schedule'`):

```ts
    if (roles.includes('directivo')) {
      can('manage', [
        'AcademicYear',
        'Grade',
        'Section',
        'Subject',
        'User',
        'Enrollment',
        'Attendance',
        'Grading',
        'Schedule',
        'VirtualClass',
        'Finance',
        'Hr',
        'Document',
        'Announcement',
        'Event',
        'Message',
        'Survey',
        'SurveyResponse',
        'Book',
        'Loan',
        'Report',
      ]);
      can('read', 'all');
    }
```

Modificar el bloque de `docente` para incluir `'VirtualClass'`:

```ts
    if (roles.includes('docente')) {
      // A diferencia del resto de docente/secretaria/estudiante/padre_tutor
      // (solo lectura): asistencia y calificaciones son tarea diaria del
      // docente, así que acá sí puede crear/editar (sin nivel de instancia
      // todavía — ve y marca cualquier sección, no solo las suyas, porque no
      // existe el concepto de "secciones asignadas a un docente" sin horarios).
      // 'VirtualClass' SÍ tiene chequeo de instancia, pero vive en el
      // use-case (SetScheduleVirtualUseCase/CancelClassSessionUseCase
      // comparan `schedule.teacherId === currentUser.sub`), no acá — CASL
      // solo autoriza "puede tocar VirtualClass en general".
      can('manage', ['Attendance', 'Grading', 'VirtualClass']);
    }
```

Agregar `'VirtualClass'` al bloque compartido de lectura (después de `'Schedule'`):

```ts
    if (roles.some((role) => ['docente', 'secretaria', 'estudiante', 'padre_tutor'].includes(role))) {
      can('read', [
        'AcademicYear',
        'Grade',
        'Section',
        'Subject',
        'Enrollment',
        'User',
        'Attendance',
        'Grading',
        'Schedule',
        'VirtualClass',
        'Finance',
        'Document',
        'Announcement',
        'Event',
        'Survey',
        'Book',
      ]);
      can('manage', ['Message', 'SurveyResponse']);
    }
```

- [ ] **Step 5: Correr los specs y confirmar que pasan**

Run: `pnpm --filter @eduapp/api test ability.factory.spec.ts`
Expected: PASS (todos los tests, incluidos los 3 nuevos).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/core/auth/casl/ability.ts apps/api/src/core/auth/casl/ability.factory.ts apps/api/src/core/auth/casl/ability.factory.spec.ts
git commit -m "feat(casl): agregar subject VirtualClass"
```

---

### Task 12: Controller + DTOs + wiring del módulo

**Files:**
- Create: `apps/api/src/modules/schedule/interface/dtos/set-schedule-virtual.dto.ts`
- Create: `apps/api/src/modules/schedule/interface/dtos/cancel-class-session.dto.ts`
- Create: `apps/api/src/modules/schedule/interface/dtos/list-class-cancellations-query.dto.ts`
- Modify: `apps/api/src/modules/schedule/interface/controllers/schedules.controller.ts`
- Modify: `apps/api/src/modules/schedule/schedule.module.ts`

**Interfaces:**
- Consumes: los 5 use-cases de las Tasks 6-10, `CurrentUser`/`JwtPayload`/`CheckPolicies` (ya existen en `core/auth`).
- Produces: `PATCH /schedule/:id/virtual`, `GET /schedule/:id/virtual-room`, `POST /schedule/:id/cancellations`, `DELETE /schedule/cancellations/:id`, `GET /schedule/cancellations`.

Los controllers de este proyecto no tienen specs propios (se prueban a través de los use-cases, ya cubiertos, y de una verificación manual end-to-end al final del plan). Este task se verifica con el build y la suite completa en verde.

- [ ] **Step 1: Crear los DTOs**

`set-schedule-virtual.dto.ts`:
```ts
import { IsBoolean } from 'class-validator';

export class SetScheduleVirtualDto {
  @IsBoolean()
  isVirtual: boolean;
}
```

`cancel-class-session.dto.ts`:
```ts
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelClassSessionDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
```

`list-class-cancellations-query.dto.ts`:
```ts
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ListClassCancellationsQueryDto {
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
```

- [ ] **Step 2: Extender el controller**

Reemplazar el contenido de `schedules.controller.ts`:

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { CreateScheduleUseCase } from '../../application/use-cases/create-schedule.use-case';
import { ListSchedulesUseCase } from '../../application/use-cases/list-schedules.use-case';
import { SetScheduleVirtualUseCase } from '../../application/use-cases/set-schedule-virtual.use-case';
import { GetVirtualRoomUseCase } from '../../application/use-cases/get-virtual-room.use-case';
import { CancelClassSessionUseCase } from '../../application/use-cases/cancel-class-session.use-case';
import { UncancelClassSessionUseCase } from '../../application/use-cases/uncancel-class-session.use-case';
import { ListClassCancellationsUseCase } from '../../application/use-cases/list-class-cancellations.use-case';
import { CreateScheduleDto } from '../dtos/create-schedule.dto';
import { ListSchedulesQueryDto } from '../dtos/list-schedules-query.dto';
import { SetScheduleVirtualDto } from '../dtos/set-schedule-virtual.dto';
import { CancelClassSessionDto } from '../dtos/cancel-class-session.dto';
import { ListClassCancellationsQueryDto } from '../dtos/list-class-cancellations-query.dto';

@Controller('schedule')
export class SchedulesController {
  constructor(
    private readonly createSchedule: CreateScheduleUseCase,
    private readonly listSchedules: ListSchedulesUseCase,
    private readonly setScheduleVirtual: SetScheduleVirtualUseCase,
    private readonly getVirtualRoom: GetVirtualRoomUseCase,
    private readonly cancelClassSession: CancelClassSessionUseCase,
    private readonly uncancelClassSession: UncancelClassSessionUseCase,
    private readonly listClassCancellations: ListClassCancellationsUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Schedule'))
  async create(@Body() dto: CreateScheduleDto) {
    return this.createSchedule.execute(dto);
  }

  @Get()
  async list(@Query() query: ListSchedulesQueryDto) {
    return this.listSchedules.execute(query);
  }

  @Get('cancellations')
  async listCancellations(@Query() query: ListClassCancellationsQueryDto) {
    return this.listClassCancellations.execute(query);
  }

  @Delete('cancellations/:id')
  @CheckPolicies((ability) => ability.can('manage', 'VirtualClass'))
  async uncancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.uncancelClassSession.execute(id, user);
    return { ok: true };
  }

  @Patch(':id/virtual')
  @CheckPolicies((ability) => ability.can('manage', 'VirtualClass'))
  async setVirtual(@Param('id') id: string, @Body() dto: SetScheduleVirtualDto, @CurrentUser() user: JwtPayload) {
    return this.setScheduleVirtual.execute(id, dto.isVirtual, user);
  }

  @Get(':id/virtual-room')
  async virtualRoom(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.getVirtualRoom.execute(id, user);
  }

  @Post(':id/cancellations')
  @CheckPolicies((ability) => ability.can('manage', 'VirtualClass'))
  async cancel(@Param('id') id: string, @Body() dto: CancelClassSessionDto, @CurrentUser() user: JwtPayload) {
    return this.cancelClassSession.execute({ scheduleId: id, date: dto.date, reason: dto.reason }, user);
  }
}
```

- [ ] **Step 3: Wirear el módulo**

Reemplazar el contenido de `schedule.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SchedulesController } from './interface/controllers/schedules.controller';
import { CreateScheduleUseCase } from './application/use-cases/create-schedule.use-case';
import { ListSchedulesUseCase } from './application/use-cases/list-schedules.use-case';
import { SetScheduleVirtualUseCase } from './application/use-cases/set-schedule-virtual.use-case';
import { GetVirtualRoomUseCase } from './application/use-cases/get-virtual-room.use-case';
import { CancelClassSessionUseCase } from './application/use-cases/cancel-class-session.use-case';
import { UncancelClassSessionUseCase } from './application/use-cases/uncancel-class-session.use-case';
import { ListClassCancellationsUseCase } from './application/use-cases/list-class-cancellations.use-case';
import { TeacherSectionsService } from './application/services/teacher-sections.service';
import { ScheduleRepositoryPort } from './application/ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from './application/ports/class-cancellation.repository.port';
import { TypeOrmScheduleRepository } from './infrastructure/repositories/typeorm-schedule.repository';
import { TypeOrmClassCancellationRepository } from './infrastructure/repositories/typeorm-class-cancellation.repository';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [SchedulesController],
  providers: [
    CreateScheduleUseCase,
    ListSchedulesUseCase,
    SetScheduleVirtualUseCase,
    GetVirtualRoomUseCase,
    CancelClassSessionUseCase,
    UncancelClassSessionUseCase,
    ListClassCancellationsUseCase,
    TeacherSectionsService,
    { provide: ScheduleRepositoryPort, useClass: TypeOrmScheduleRepository },
    { provide: ClassCancellationRepositoryPort, useClass: TypeOrmClassCancellationRepository },
  ],
  exports: [TeacherSectionsService],
})
export class ScheduleModule {}
```

- [ ] **Step 4: Build y suite completa del backend**

Run: `pnpm --filter @eduapp/api build && pnpm --filter @eduapp/api test`
Expected: build sin errores, todos los specs en verde (los nuevos de las Tasks 2-11 + los preexistentes).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/schedule/interface apps/api/src/modules/schedule/schedule.module.ts
git commit -m "feat(schedule): exponer endpoints de clases virtuales y cancelaciones"
```

---

### Task 13: `shared-types` — `Schedule.isVirtual`, `ClassCancellation`, `VirtualRoom`

**Files:**
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Produces: `Schedule.isVirtual: boolean`; `ClassCancellation { id, scheduleId, date, cancelledBy, reason }`; `VirtualRoom { roomName, roomUrl }` — usados por los hooks/componentes de las Tasks 15-19.

- [ ] **Step 1: Editar la interfaz `Schedule` y agregar las dos nuevas**

Reemplazar el bloque actual de `Schedule` (y agregar los tipos nuevos justo después):

```ts
export interface Schedule {
  id: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isVirtual: boolean;
}

export interface ClassCancellation {
  id: string;
  scheduleId: string;
  date: string;
  cancelledBy: string;
  reason: string | null;
}

export interface VirtualRoom {
  roomName: string;
  roomUrl: string;
}
```

- [ ] **Step 2: Build de ambas apps para confirmar que el tipo se propaga sin romper nada**

Run: `pnpm --filter @eduapp/api build && pnpm --filter @eduapp/web build`
Expected: sin errores de TypeScript (el `CreateScheduleUseCase` sigue construyendo `Schedule` con `isVirtual` opcional por el default en el dominio; el DTO/tipo de `shared-types` de la API se serializa desde el dominio, así que `isVirtual` siempre viene presente en runtime).

- [ ] **Step 3: Commit**

```bash
git add packages/shared-types/src/index.ts
git commit -m "feat(shared-types): agregar isVirtual, ClassCancellation y VirtualRoom"
```

---

### Task 14: `apps/web/src/lib/date.ts` — `todayDayOfWeek()`

**Files:**
- Modify: `apps/web/src/lib/date.ts`

**Interfaces:**
- Produces: `todayDayOfWeek(): DayOfWeek | null` — usado por `schedule-grid.tsx`/`schedules-list.tsx` (Task 18) para decidir si mostrar los controles de videollamada.

- [ ] **Step 1: Agregar la función**

Agregar al final de `date.ts`:

```ts
import type { DayOfWeek } from '@eduapp/shared-types';

const DAYS_BY_INDEX: (DayOfWeek | null)[] = [null, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/**
 * Día de la semana de hoy en el formato usado por `Schedule.dayOfWeek`
 * ('lunes'..'sabado'), o `null` los domingos (no hay horarios ese día).
 */
export function todayDayOfWeek(): DayOfWeek | null {
  return DAYS_BY_INDEX[new Date().getDay()];
}
```

(El `import` va al principio del archivo, no al final — juntarlo con el resto de imports si `date.ts` ya tiene alguno.)

- [ ] **Step 2: Build**

Run: `pnpm --filter @eduapp/web build`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/date.ts
git commit -m "feat(web): agregar todayDayOfWeek para clases virtuales"
```

---

### Task 15: Rutas BFF de clases virtuales y cancelaciones

**Files:**
- Create: `apps/web/src/app/api/schedule/[id]/virtual/route.ts`
- Create: `apps/web/src/app/api/schedule/[id]/virtual-room/route.ts`
- Create: `apps/web/src/app/api/schedule/[id]/cancellations/route.ts`
- Create: `apps/web/src/app/api/schedule/cancellations/route.ts`
- Create: `apps/web/src/app/api/schedule/cancellations/[id]/route.ts`

**Interfaces:**
- Produces: `PATCH /api/schedule/:id/virtual`, `GET /api/schedule/:id/virtual-room`, `POST /api/schedule/:id/cancellations`, `GET /api/schedule/cancellations`, `DELETE /api/schedule/cancellations/:id` — usados por los hooks de la Task 16.

Estas rutas son proxies mecánicos hacia el backend (mismo patrón ya usado en `api/finance/charges/[id]/route.ts`: fetch directo con el access token de la cookie, sin `serverApiFetch`, para propagar el mensaje real del backend en vez de uno genérico). No tienen test unitario propio en este codebase — se verifican al final del plan, en el navegador.

- [ ] **Step 1: `apps/web/src/app/api/schedule/[id]/virtual/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { Schedule } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const apiRes = await fetch(`${API_URL}/schedule/${params.id}/virtual`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudo actualizar la clase virtual';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const schedule = (await apiRes.json()) as Schedule;
  return NextResponse.json(schedule);
}
```

- [ ] **Step 2: `apps/web/src/app/api/schedule/[id]/virtual-room/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { VirtualRoom } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const apiRes = await fetch(`${API_URL}/schedule/${params.id}/virtual-room`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudo obtener la sala';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const room = (await apiRes.json()) as VirtualRoom;
  return NextResponse.json(room);
}
```

- [ ] **Step 3: `apps/web/src/app/api/schedule/[id]/cancellations/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { ClassCancellation } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const apiRes = await fetch(`${API_URL}/schedule/${params.id}/cancellations`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudo cancelar la clase';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const cancellation = (await apiRes.json()) as ClassCancellation;
  return NextResponse.json(cancellation, { status: 201 });
}
```

- [ ] **Step 4: `apps/web/src/app/api/schedule/cancellations/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { ClassCancellation } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET(req: NextRequest) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const qs = req.nextUrl.searchParams.toString();
  const apiRes = await fetch(`${API_URL}/schedule/cancellations?${qs}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudieron cargar las cancelaciones';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const cancellations = (await apiRes.json()) as ClassCancellation[];
  return NextResponse.json(cancellations);
}
```

- [ ] **Step 5: `apps/web/src/app/api/schedule/cancellations/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const apiRes = await fetch(`${API_URL}/schedule/cancellations/${params.id}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudo revertir la cancelación';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Build**

Run: `pnpm --filter @eduapp/web build`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/api/schedule
git commit -m "feat(web): agregar rutas BFF de clases virtuales y cancelaciones"
```

---

### Task 16: Hooks — `use-schedules.ts` extendido + `use-class-cancellations.ts`

**Files:**
- Modify: `apps/web/src/features/schedule/use-schedules.ts`
- Create: `apps/web/src/features/schedule/use-class-cancellations.ts`

**Interfaces:**
- Consumes: rutas BFF de la Task 15.
- Produces: `useSetScheduleVirtual()`, `useJoinVirtualClass()`, `useClassCancellations(filter)`, `useCancelClassSession()`, `useUncancelClassSession()` — usados por `VirtualClassControls` (Task 17) y `CreateScheduleForm` (Task 19).

- [ ] **Step 1: Agregar `useSetScheduleVirtual` y `useJoinVirtualClass` a `use-schedules.ts`**

Agregar al final del archivo (y `VirtualRoom` al import de tipos del encabezado):

```ts
import type { DayOfWeek, Schedule, VirtualRoom } from '@eduapp/shared-types';

// ...contenido existente sin cambios...

export interface SetScheduleVirtualInput {
  id: string;
  isVirtual: boolean;
}

async function setScheduleVirtual({ id, isVirtual }: SetScheduleVirtualInput): Promise<Schedule> {
  const res = await fetch(`/api/schedule/${id}/virtual`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ isVirtual }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo actualizar la clase virtual');
  }
  return res.json();
}

export function useSetScheduleVirtual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setScheduleVirtual,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

async function fetchVirtualRoom(scheduleId: string): Promise<VirtualRoom> {
  const res = await fetch(`/api/schedule/${scheduleId}/virtual-room`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo obtener la sala');
  }
  return res.json();
}

export function useJoinVirtualClass() {
  return useMutation({
    mutationFn: fetchVirtualRoom,
    onSuccess: (room) => {
      window.open(room.roomUrl, '_blank', 'noopener,noreferrer');
    },
  });
}
```

- [ ] **Step 2: Crear `use-class-cancellations.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClassCancellation } from '@eduapp/shared-types';

export interface ClassCancellationFilter {
  sectionId?: string;
  teacherId?: string;
  from: string;
  to: string;
}

async function fetchClassCancellations(filter: ClassCancellationFilter): Promise<ClassCancellation[]> {
  const qs = new URLSearchParams(filter as unknown as Record<string, string>).toString();
  const res = await fetch(`/api/schedule/cancellations?${qs}`);
  if (!res.ok) throw new Error('No se pudieron cargar las cancelaciones');
  return res.json();
}

export function useClassCancellations(filter: ClassCancellationFilter) {
  return useQuery({
    queryKey: ['class-cancellations', filter],
    queryFn: () => fetchClassCancellations(filter),
  });
}

export interface CancelClassSessionInput {
  scheduleId: string;
  date: string;
  reason?: string;
}

async function cancelClassSession(input: CancelClassSessionInput): Promise<ClassCancellation> {
  const res = await fetch(`/api/schedule/${input.scheduleId}/cancellations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ date: input.date, reason: input.reason }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo cancelar la clase');
  }
  return res.json();
}

export function useCancelClassSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelClassSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['class-cancellations'] }),
  });
}

async function uncancelClassSession(cancellationId: string): Promise<void> {
  const res = await fetch(`/api/schedule/cancellations/${cancellationId}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo revertir la cancelación');
  }
}

export function useUncancelClassSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uncancelClassSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['class-cancellations'] }),
  });
}
```

- [ ] **Step 3: Build**

Run: `pnpm --filter @eduapp/web build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/schedule/use-schedules.ts apps/web/src/features/schedule/use-class-cancellations.ts
git commit -m "feat(web): agregar hooks de clases virtuales y cancelaciones"
```

---

### Task 17: Componente `VirtualClassControls`

**Files:**
- Create: `apps/web/src/features/schedule/components/virtual-class-controls.tsx`

**Interfaces:**
- Consumes: `useJoinVirtualClass`, `useCancelClassSession`, `useUncancelClassSession` (Task 16), `todayLocalDate` (ya existe en `@/lib/date`).
- Produces: `<VirtualClassControls schedule={Schedule} cancellation={ClassCancellation | undefined} canAct={boolean} />` — usado por `schedule-grid.tsx`/`schedules-list.tsx` (Task 18).

- [ ] **Step 1: Crear el componente**

```tsx
'use client';

import { useState } from 'react';
import type { ClassCancellation, Schedule } from '@eduapp/shared-types';
import { useJoinVirtualClass } from '../use-schedules';
import { useCancelClassSession, useUncancelClassSession } from '../use-class-cancellations';
import { Button } from '@/components/ui/button';
import { todayLocalDate } from '@/lib/date';

export function VirtualClassControls({
  schedule,
  cancellation,
  canAct,
}: {
  schedule: Schedule;
  cancellation: ClassCancellation | undefined;
  canAct: boolean;
}) {
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState('');
  const joinVirtualClass = useJoinVirtualClass();
  const cancelClassSession = useCancelClassSession();
  const uncancelClassSession = useUncancelClassSession();

  if (cancellation) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive"
          title={cancellation.reason ?? undefined}
        >
          Cancelada
        </span>
        {canAct && (
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs"
            disabled={uncancelClassSession.isPending}
            onClick={() => uncancelClassSession.mutate(cancellation.id)}
          >
            Revertir
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          className="h-8 px-3 text-xs"
          disabled={joinVirtualClass.isPending}
          onClick={() => joinVirtualClass.mutate(schedule.id)}
        >
          Unirse
        </Button>
        {canAct && !showReasonInput && (
          <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => setShowReasonInput(true)}>
            Cancelar clase de hoy
          </Button>
        )}
      </div>
      {showReasonInput && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-8 w-48 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          />
          <Button
            variant="secondary"
            className="h-8 px-3 text-xs"
            disabled={cancelClassSession.isPending}
            onClick={() =>
              cancelClassSession.mutate(
                { scheduleId: schedule.id, date: todayLocalDate(), reason: reason || undefined },
                { onSuccess: () => setShowReasonInput(false) },
              )
            }
          >
            Confirmar cancelación
          </Button>
          <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => setShowReasonInput(false)}>
            Volver
          </Button>
        </div>
      )}
      {cancelClassSession.isError && (
        <p className="text-xs text-destructive">{(cancelClassSession.error as Error).message}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `pnpm --filter @eduapp/web build`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/schedule/components/virtual-class-controls.tsx
git commit -m "feat(web): agregar componente VirtualClassControls"
```

---

### Task 18: Integrar `VirtualClassControls` en la vista de Horarios

**Files:**
- Modify: `apps/web/src/features/schedule/components/schedules-list.tsx`
- Modify: `apps/web/src/features/schedule/components/schedule-grid.tsx`
- Modify: `apps/web/src/features/schedule/components/schedule-view-toggle.tsx`
- Modify: `apps/web/src/app/(dashboard)/schedule/page.tsx`

**Interfaces:**
- Consumes: `VirtualClassControls` (Task 17), `useClassCancellations` (Task 16), `todayDayOfWeek`/`todayLocalDate` (`@/lib/date`).
- Produces: `SchedulesList`/`ScheduleGrid` reciben `currentUserId?: string` y `canManage: boolean`; se les puede pasar la clase virtual del día.

- [ ] **Step 1: `schedules-list.tsx` — recibir props y renderizar controles para la clase de hoy**

Reemplazar el contenido completo:

```tsx
'use client';

import { useSchedules } from '../use-schedules';
import { useClassCancellations } from '../use-class-cancellations';
import { useSections } from '@/features/academic/use-sections';
import { useSubjects } from '@/features/academic/use-subjects';
import { useUsers } from '@/features/users/use-users';
import { Card } from '@/components/ui/card';
import { VirtualClassControls } from './virtual-class-controls';
import { todayDayOfWeek, todayLocalDate } from '@/lib/date';

const DAY_LABELS: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
};

export function SchedulesList({
  currentUserId,
  canManage,
}: {
  currentUserId?: string;
  canManage: boolean;
}) {
  const { data: schedules, isLoading, error } = useSchedules();
  const { data: sections } = useSections();
  const { data: subjects } = useSubjects();
  const { data: teachers } = useUsers('docente');
  const today = todayLocalDate();
  const { data: cancellations } = useClassCancellations({ from: today, to: today });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los horarios.</p>;
  if (!schedules || schedules.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay horarios.</p>;
  }

  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));
  const subjectNameById = new Map(subjects?.map((s) => [s.id, s.name]));
  const teacherNameById = new Map(teachers?.map((t) => [t.id, t.fullName]));
  const cancellationByScheduleId = new Map(cancellations?.map((c) => [c.scheduleId, c]));
  const todaysDay = todayDayOfWeek();

  return (
    <ul className="space-y-2">
      {schedules.map((schedule) => (
        <Card key={schedule.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">
              {subjectNameById.get(schedule.subjectId) ?? schedule.subjectId} — Sección{' '}
              {sectionNameById.get(schedule.sectionId) ?? schedule.sectionId}
            </p>
            <p className="text-sm text-muted-foreground">
              {teacherNameById.get(schedule.teacherId) ?? schedule.teacherId}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {DAY_LABELS[schedule.dayOfWeek] ?? schedule.dayOfWeek} {schedule.startTime}–
              {schedule.endTime}
            </span>
            {schedule.isVirtual && schedule.dayOfWeek === todaysDay && (
              <VirtualClassControls
                schedule={schedule}
                cancellation={cancellationByScheduleId.get(schedule.id)}
                canAct={canManage || schedule.teacherId === currentUserId}
              />
            )}
          </div>
        </Card>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: `schedule-grid.tsx` — recibir props y renderizar controles en la celda de hoy**

Reemplazar el contenido completo:

```tsx
'use client';

import { useState } from 'react';
import { useSchedules } from '../use-schedules';
import { useClassCancellations } from '../use-class-cancellations';
import { useSections } from '@/features/academic/use-sections';
import { useSubjects } from '@/features/academic/use-subjects';
import { useUsers } from '@/features/users/use-users';
import { Label } from '@/components/ui/label';
import { VirtualClassControls } from './virtual-class-controls';
import { todayDayOfWeek, todayLocalDate } from '@/lib/date';

const DAYS = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
] as const;

export function ScheduleGrid({
  currentUserId,
  canManage,
}: {
  currentUserId?: string;
  canManage: boolean;
}) {
  const { data: schedules } = useSchedules();
  const { data: sections } = useSections();
  const { data: subjects } = useSubjects();
  const { data: teachers } = useUsers('docente');
  const [sectionId, setSectionId] = useState('');
  const today = todayLocalDate();
  const { data: cancellations } = useClassCancellations({ from: today, to: today });
  const todaysDay = todayDayOfWeek();

  const subjectNameById = new Map(subjects?.map((s) => [s.id, s.name]));
  const teacherNameById = new Map(teachers?.map((t) => [t.id, t.fullName]));
  const cancellationByScheduleId = new Map(cancellations?.map((c) => [c.scheduleId, c]));

  const sectionSchedules = (schedules ?? []).filter((s) => !sectionId || s.sectionId === sectionId);
  const timeSlots = Array.from(
    new Set(sectionSchedules.map((s) => `${s.startTime}-${s.endTime}`)),
  ).sort();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="grid-section">Sección</Label>
        <select
          id="grid-section"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="flex h-10 w-56 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">Elegir sección...</option>
          {sections?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {!sectionId ? (
        <p className="text-sm text-muted-foreground">Elegí una sección para ver su grilla semanal.</p>
      ) : timeSlots.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin horarios cargados para esta sección.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-border p-2 text-left text-xs text-muted-foreground">
                  Horario
                </th>
                {DAYS.map((day) => (
                  <th key={day.value} className="border border-border p-2 text-xs text-muted-foreground">
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => (
                <tr key={slot}>
                  <td className="border border-border p-2 text-xs text-muted-foreground">{slot}</td>
                  {DAYS.map((day) => {
                    const match = sectionSchedules.find(
                      (s) => `${s.startTime}-${s.endTime}` === slot && s.dayOfWeek === day.value,
                    );
                    return (
                      <td key={day.value} className="border border-border p-2 align-top">
                        {match ? (
                          <div className="space-y-1">
                            <p className="font-medium">
                              {subjectNameById.get(match.subjectId) ?? match.subjectId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {teacherNameById.get(match.teacherId) ?? match.teacherId}
                            </p>
                            {match.isVirtual && match.dayOfWeek === todaysDay && (
                              <VirtualClassControls
                                schedule={match}
                                cancellation={cancellationByScheduleId.get(match.id)}
                                canAct={canManage || match.teacherId === currentUserId}
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `schedule-view-toggle.tsx` — pasar las props hacia abajo**

Reemplazar el contenido completo:

```tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { SchedulesList } from './schedules-list';
import { ScheduleGrid } from './schedule-grid';

export function ScheduleViewToggle({
  currentUserId,
  canManage,
}: {
  currentUserId?: string;
  canManage: boolean;
}) {
  const [view, setView] = useState<'list' | 'grid'>('list');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {(['list', 'grid'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              'px-3 py-2 text-sm transition-colors',
              view === v
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {v === 'list' ? 'Vista lista' : 'Vista por curso'}
          </button>
        ))}
      </div>
      {view === 'list' ? (
        <SchedulesList currentUserId={currentUserId} canManage={canManage} />
      ) : (
        <ScheduleGrid currentUserId={currentUserId} canManage={canManage} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: `page.tsx` — pasar el usuario actual**

Reemplazar el contenido completo:

```tsx
import { CreateScheduleForm } from '@/features/schedule/components/create-schedule-form';
import { ScheduleViewToggle } from '@/features/schedule/components/schedule-view-toggle';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAcademic } from '@/lib/permissions';

export default async function SchedulePage() {
  const user = await getCurrentUser();
  const canManage = canManageAcademic(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          Asignación de docentes a secciones y asignaturas por bloque horario.
        </p>
      </div>

      {canManage && <CreateScheduleForm />}
      <ScheduleViewToggle currentUserId={user?.id} canManage={canManage} />
    </main>
  );
}
```

- [ ] **Step 5: Build**

Run: `pnpm --filter @eduapp/web build`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/schedule/components/schedules-list.tsx apps/web/src/features/schedule/components/schedule-grid.tsx apps/web/src/features/schedule/components/schedule-view-toggle.tsx "apps/web/src/app/(dashboard)/schedule/page.tsx"
git commit -m "feat(web): integrar controles de clase virtual en Horarios"
```

---

### Task 19: Checkbox "Clase virtual" en `CreateScheduleForm`

**Files:**
- Modify: `apps/web/src/features/schedule/components/create-schedule-form.tsx`

**Interfaces:**
- Consumes: `useSetScheduleVirtual` (Task 16).

- [ ] **Step 1: Agregar el estado, el checkbox y encadenar la llamada tras crear**

Reemplazar el contenido completo:

```tsx
'use client';

import { FormEvent, useState } from 'react';
import { useCreateSchedule, useSetScheduleVirtual } from '../use-schedules';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { useSubjects } from '@/features/academic/use-subjects';
import { useUsers } from '@/features/users/use-users';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { DayOfWeek } from '@eduapp/shared-types';

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
];

export function CreateScheduleForm() {
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();
  const { data: subjects } = useSubjects();
  const { data: teachers } = useUsers('docente');
  const createSchedule = useCreateSchedule();
  const setScheduleVirtual = useSetScheduleVirtual();

  const [academicYearId, setAcademicYearId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('lunes');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [isVirtual, setIsVirtual] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!academicYearId || !sectionId || !subjectId || !teacherId) return;
    const schedule = await createSchedule.mutateAsync({
      academicYearId,
      sectionId,
      subjectId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
    });
    if (isVirtual) {
      setScheduleVirtual.mutate({ id: schedule.id, isVirtual: true });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="academicYearId">Año lectivo</Label>
        <select
          id="academicYearId"
          required
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          className="flex h-10 w-32 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Año
          </option>
          {years?.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sectionId">Sección</Label>
        <select
          id="sectionId"
          required
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="flex h-10 w-28 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Sección
          </option>
          {sections?.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subjectId">Asignatura</Label>
        <select
          id="subjectId"
          required
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="flex h-10 w-36 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Asignatura
          </option>
          {subjects?.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="teacherId">Docente</Label>
        <select
          id="teacherId"
          required
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Docente
          </option>
          {teachers?.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dayOfWeek">Día</Label>
        <select
          id="dayOfWeek"
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
          className="flex h-10 w-32 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="startTime">Inicio</Label>
        <Input
          id="startTime"
          type="time"
          required
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endTime">Fin</Label>
        <Input
          id="endTime"
          type="time"
          required
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 pb-2.5">
        <input
          id="isVirtual"
          type="checkbox"
          checked={isVirtual}
          onChange={(e) => setIsVirtual(e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="isVirtual">Clase virtual</Label>
      </div>
      <Button type="submit" disabled={createSchedule.isPending}>
        {createSchedule.isPending ? 'Creando...' : 'Crear horario'}
      </Button>
      {createSchedule.isError && (
        <p className="w-full text-sm text-destructive">
          No se pudo crear el horario (¿superpone con otro del docente o la sección?).
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Build**

Run: `pnpm --filter @eduapp/web build`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/schedule/components/create-schedule-form.tsx
git commit -m "feat(web): agregar checkbox de clase virtual al crear horario"
```

---

## Verificación final end-to-end (en navegador)

1. Correr `pnpm --filter @eduapp/api migration:run:tenant:all` si no se corrió en la Task 1, y levantar API + web.
2. Como `directivo`, crear un horario nuevo marcando "Clase virtual", para el día de la semana de hoy.
3. Confirmar que en la vista de Horarios (lista y grilla) aparece el botón "Unirse" para ese horario, y que abre una sala válida de `meet.jit.si` en una pestaña nueva.
4. Como el `docente` dueño de ese horario, confirmar que también ve "Cancelar clase de hoy"; como otro docente sin ese horario, confirmar que NO lo ve.
5. Cancelar la clase de hoy con un motivo — confirmar que el botón cambia a "Cancelada" (con el motivo en el tooltip) y que "Unirse" desaparece.
6. Intentar cancelar de nuevo la misma fecha (ej. desde otra pestaña) — confirmar 409 con el mensaje real, no un 500.
7. Revertir la cancelación — confirmar que "Unirse"/"Cancelar clase de hoy" vuelven a aparecer.
8. Como `estudiante`/`padre_tutor`, confirmar que solo ven "Unirse" (o "Cancelada"), nunca "Cancelar"/"Revertir".
9. Confirmar en la sala de Jitsi que el botón de compartir pantalla está disponible en la barra de herramientas (comportamiento nativo, sin configuración adicional).
