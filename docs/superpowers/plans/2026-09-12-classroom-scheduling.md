# Modelado de aulas con detección de conflictos de horario — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un catálogo simple de aulas (`Classroom`) y una tercera dimensión de conflicto de horario (aula, junto a docente y sección) al mecanismo de validación que ya existe en `CreateScheduleUseCase`.

**Architecture:** `Classroom` es una entidad de catálogo nueva dentro del módulo `academic` (mirror exacto de `Subject`: sin edición ni desactivación). `Schedule` gana un campo `classroomId` opcional. La detección de conflicto reusa el patrón `findAll(filter)` + `.overlaps()` que ya usan docente y sección, reforzado con un tercer constraint `EXCLUDE USING gist` en Postgres.

**Tech Stack:** NestJS (hexagonal: domain/application/infrastructure/interface), TypeORM + Postgres (con `btree_gist`), class-validator, CASL, Next.js App Router + React Query, Jest.

**Spec:** `docs/superpowers/specs/2026-09-12-classroom-scheduling-design.md`

## Global Constraints

- Aula es **opcional** (`classroomId: string | null`) — ningún horario existente ni nuevo requiere aula.
- `Classroom` **no tiene edición ni desactivación** — mismo nivel de funcionalidad que `Subject` hoy (solo alta + listado).
- La detección de conflicto de aula es **estricta** (bloquea con 409), igual que docente/sección — no es una advertencia.
- El conflicto de aula se filtra también por `academicYearId` (igual que sección, a diferencia de docente) — dos horarios en la misma aula/día/rango pero en años lectivos distintos NO son un conflicto.
- Sin estructura física (sedes/edificios/pisos), sin backfill de datos existentes, sin reserva de otros recursos — todo eso está fuera de alcance por diseño (ver spec).
- Todo mensaje de error de conflicto de aula usa el texto exacto: `'El aula ya tiene otro horario asignado en ese rango'`.

---

### Task 1: `Classroom` — entidad de dominio, puerto, ORM y migración

**Files:**
- Create: `apps/api/src/modules/academic/domain/entities/classroom.entity.ts`
- Create: `apps/api/src/modules/academic/domain/entities/classroom.entity.spec.ts`
- Create: `apps/api/src/modules/academic/application/ports/classroom.repository.port.ts`
- Create: `apps/api/src/modules/academic/infrastructure/entities/classroom.orm-entity.ts`
- Create: `apps/api/src/modules/academic/infrastructure/repositories/typeorm-classroom.repository.ts`
- Create: `apps/api/src/core/database/migrations/tenant/1700000000070-CreateClassroomsAndScheduleConflict.ts`

**Interfaces:**
- Produces: `Classroom` (`{id: string, name: string, capacity: number}`, constructor lanza `Error` si `capacity <= 0`), `ClassroomRepositoryPort.findAll(): Promise<Classroom[]>` / `.save(classroom: Classroom): Promise<void>`, tabla Postgres `classrooms`, columna `schedules.classroom_id` (nullable, FK a `classrooms.id`) + constraint `excl_schedules_classroom_overlap`.

- [ ] **Step 1: Escribir el test de la entidad `Classroom`**

```ts
// apps/api/src/modules/academic/domain/entities/classroom.entity.spec.ts
import { Classroom } from './classroom.entity';

describe('Classroom', () => {
  it('se crea con nombre y capacidad', () => {
    const classroom = new Classroom('c-1', 'Aula 201', 30);
    expect(classroom.name).toBe('Aula 201');
    expect(classroom.capacity).toBe(30);
  });

  it('rechaza capacidad menor o igual a cero', () => {
    expect(() => new Classroom('c-1', 'Aula 201', 0)).toThrow('La capacidad debe ser mayor a cero');
    expect(() => new Classroom('c-1', 'Aula 201', -5)).toThrow('La capacidad debe ser mayor a cero');
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest classroom.entity.spec.ts`
Expected: FAIL — `Cannot find module './classroom.entity'`

- [ ] **Step 3: Implementar la entidad `Classroom`**

```ts
// apps/api/src/modules/academic/domain/entities/classroom.entity.ts
export class Classroom {
  constructor(
    public readonly id: string,
    public name: string,
    public capacity: number,
  ) {
    if (capacity <= 0) {
      throw new Error('La capacidad debe ser mayor a cero');
    }
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest classroom.entity.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Crear el puerto del repositorio**

```ts
// apps/api/src/modules/academic/application/ports/classroom.repository.port.ts
import { Classroom } from '../../domain/entities/classroom.entity';

export abstract class ClassroomRepositoryPort {
  abstract findAll(): Promise<Classroom[]>;
  abstract save(classroom: Classroom): Promise<void>;
}
```

- [ ] **Step 6: Crear la entidad ORM**

```ts
// apps/api/src/modules/academic/infrastructure/entities/classroom.orm-entity.ts
import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'classrooms' })
export class ClassroomOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  capacity: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
```

- [ ] **Step 7: Implementar el repositorio TypeORM**

```ts
// apps/api/src/modules/academic/infrastructure/repositories/typeorm-classroom.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClassroomRepositoryPort } from '../../application/ports/classroom.repository.port';
import { Classroom } from '../../domain/entities/classroom.entity';
import { ClassroomOrmEntity } from '../entities/classroom.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmClassroomRepository extends ClassroomRepositoryPort {
  private readonly repo: Repository<ClassroomOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(ClassroomOrmEntity);
  }

  async findAll(): Promise<Classroom[]> {
    const rows = await this.repo.find({ order: { name: 'ASC' } });
    return rows.map((row) => new Classroom(row.id, row.name, row.capacity));
  }

  async save(classroom: Classroom): Promise<void> {
    await this.repo.save({ id: classroom.id, name: classroom.name, capacity: classroom.capacity });
  }
}
```

- [ ] **Step 8: Escribir la migración (tabla `classrooms` + columna/constraint en `schedules`)**

```ts
// apps/api/src/core/database/migrations/tenant/1700000000070-CreateClassroomsAndScheduleConflict.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Mismo patrón que 1700000000015-AddScheduleOverlapConstraint.ts: la
 * expresión int4range se arma a mano desde start_time/end_time (varchar
 * "HH:mm") porque el cast a timestamp no es IMMUTABLE y un EXCLUDE lo
 * exige. btree_gist ya está habilitado desde esa migración.
 */
export class CreateClassroomsAndScheduleConflict1700000000070 implements MigrationInterface {
  name = 'CreateClassroomsAndScheduleConflict1700000000070';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "classrooms" (
        "id" uuid PRIMARY KEY,
        "name" varchar NOT NULL,
        "capacity" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "schedules" ADD COLUMN "classroom_id" uuid REFERENCES "classrooms"("id")
    `);

    const rangeExpr = `
      int4range(
        (substring("start_time" from 1 for 2)::int * 60 + substring("start_time" from 4 for 2)::int),
        (substring("end_time" from 1 for 2)::int * 60 + substring("end_time" from 4 for 2)::int)
      )
    `;

    await queryRunner.query(`
      ALTER TABLE "schedules" ADD CONSTRAINT "excl_schedules_classroom_overlap"
      EXCLUDE USING gist (
        "classroom_id" WITH =,
        "academic_year_id" WITH =,
        "day_of_week" WITH =,
        ${rangeExpr} WITH &&
      ) WHERE ("deleted_at" IS NULL AND "classroom_id" IS NOT NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT "excl_schedules_classroom_overlap"`);
    await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "classroom_id"`);
    await queryRunner.query(`DROP TABLE "classrooms"`);
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/academic/domain/entities/classroom.entity.ts \
  apps/api/src/modules/academic/domain/entities/classroom.entity.spec.ts \
  apps/api/src/modules/academic/application/ports/classroom.repository.port.ts \
  apps/api/src/modules/academic/infrastructure/entities/classroom.orm-entity.ts \
  apps/api/src/modules/academic/infrastructure/repositories/typeorm-classroom.repository.ts \
  apps/api/src/core/database/migrations/tenant/1700000000070-CreateClassroomsAndScheduleConflict.ts
git commit -m "feat(academic): entidad Classroom + tabla + columna classroom_id en schedules"
```

---

### Task 2: `Classroom` — casos de uso, controller, CASL y registro de módulo

**Files:**
- Create: `apps/api/src/modules/academic/application/use-cases/create-classroom.use-case.ts`
- Create: `apps/api/src/modules/academic/application/use-cases/create-classroom.use-case.spec.ts`
- Create: `apps/api/src/modules/academic/application/use-cases/list-classrooms.use-case.ts`
- Create: `apps/api/src/modules/academic/application/use-cases/list-classrooms.use-case.spec.ts`
- Create: `apps/api/src/modules/academic/interface/dtos/create-classroom.dto.ts`
- Create: `apps/api/src/modules/academic/interface/controllers/classrooms.controller.ts`
- Modify: `apps/api/src/modules/academic/academic.module.ts`
- Modify: `apps/api/src/core/auth/casl/ability.ts`
- Modify: `apps/api/src/core/auth/casl/ability.factory.ts`
- Modify: `apps/api/src/core/auth/casl/ability.factory.spec.ts`

**Interfaces:**
- Consumes: `Classroom`, `ClassroomRepositoryPort` (Task 1).
- Produces: `POST academic/classrooms` (`CheckPolicies(can('create', 'Classroom'))`), `GET academic/classrooms` (cualquier usuario autenticado), `AppSubjects` incluye `'Classroom'`.

- [ ] **Step 1: Escribir el test de `CreateClassroomUseCase`**

```ts
// apps/api/src/modules/academic/application/use-cases/create-classroom.use-case.spec.ts
import { CreateClassroomUseCase } from './create-classroom.use-case';
import { ClassroomRepositoryPort } from '../ports/classroom.repository.port';

describe('CreateClassroomUseCase', () => {
  const classrooms: jest.Mocked<ClassroomRepositoryPort> = {
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new CreateClassroomUseCase(classrooms);

  beforeEach(() => jest.clearAllMocks());

  it('crea y guarda un aula', async () => {
    const result = await useCase.execute({ name: 'Aula 201', capacity: 30 });
    expect(result.name).toBe('Aula 201');
    expect(result.capacity).toBe(30);
    expect(classrooms.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Aula 201', capacity: 30 }));
  });

  it('propaga el error de capacidad inválida de la entidad', async () => {
    await expect(useCase.execute({ name: 'Aula 201', capacity: 0 })).rejects.toThrow(
      'La capacidad debe ser mayor a cero',
    );
    expect(classrooms.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest create-classroom.use-case.spec.ts`
Expected: FAIL — `Cannot find module './create-classroom.use-case'`

- [ ] **Step 3: Implementar `CreateClassroomUseCase`**

```ts
// apps/api/src/modules/academic/application/use-cases/create-classroom.use-case.ts
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ClassroomRepositoryPort } from '../ports/classroom.repository.port';
import { Classroom } from '../../domain/entities/classroom.entity';

export interface CreateClassroomInput {
  name: string;
  capacity: number;
}

@Injectable()
export class CreateClassroomUseCase {
  constructor(@Inject(ClassroomRepositoryPort) private readonly classrooms: ClassroomRepositoryPort) {}

  async execute(input: CreateClassroomInput): Promise<Classroom> {
    const classroom = new Classroom(randomUUID(), input.name, input.capacity);
    await this.classrooms.save(classroom);
    return classroom;
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest create-classroom.use-case.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Escribir el test de `ListClassroomsUseCase`**

```ts
// apps/api/src/modules/academic/application/use-cases/list-classrooms.use-case.spec.ts
import { ListClassroomsUseCase } from './list-classrooms.use-case';
import { ClassroomRepositoryPort } from '../ports/classroom.repository.port';
import { Classroom } from '../../domain/entities/classroom.entity';

describe('ListClassroomsUseCase', () => {
  const classrooms: jest.Mocked<ClassroomRepositoryPort> = {
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new ListClassroomsUseCase(classrooms);

  beforeEach(() => jest.clearAllMocks());

  it('devuelve todas las aulas del repositorio', async () => {
    classrooms.findAll.mockResolvedValue([new Classroom('c-1', 'Aula 201', 30)]);
    const result = await useCase.execute();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Aula 201');
  });
});
```

- [ ] **Step 6: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest list-classrooms.use-case.spec.ts`
Expected: FAIL — `Cannot find module './list-classrooms.use-case'`

- [ ] **Step 7: Implementar `ListClassroomsUseCase`**

```ts
// apps/api/src/modules/academic/application/use-cases/list-classrooms.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { ClassroomRepositoryPort } from '../ports/classroom.repository.port';
import { Classroom } from '../../domain/entities/classroom.entity';

@Injectable()
export class ListClassroomsUseCase {
  constructor(@Inject(ClassroomRepositoryPort) private readonly classrooms: ClassroomRepositoryPort) {}

  async execute(): Promise<Classroom[]> {
    return this.classrooms.findAll();
  }
}
```

- [ ] **Step 8: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest list-classrooms.use-case.spec.ts`
Expected: PASS (1 test)

- [ ] **Step 9: Crear el DTO de creación**

```ts
// apps/api/src/modules/academic/interface/dtos/create-classroom.dto.ts
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateClassroomDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsInt()
  @Min(1)
  capacity: number;
}
```

- [ ] **Step 10: Crear el controller**

```ts
// apps/api/src/modules/academic/interface/controllers/classrooms.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateClassroomUseCase } from '../../application/use-cases/create-classroom.use-case';
import { ListClassroomsUseCase } from '../../application/use-cases/list-classrooms.use-case';
import { CreateClassroomDto } from '../dtos/create-classroom.dto';

@Controller('academic/classrooms')
export class ClassroomsController {
  constructor(
    private readonly createClassroom: CreateClassroomUseCase,
    private readonly listClassrooms: ListClassroomsUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Classroom'))
  async create(@Body() dto: CreateClassroomDto) {
    return this.createClassroom.execute(dto);
  }

  @Get()
  async list() {
    return this.listClassrooms.execute();
  }
}
```

- [ ] **Step 11: Agregar `'Classroom'` a `AppSubjects`**

En `apps/api/src/core/auth/casl/ability.ts`, en la unión `AppSubjects`, agregar `'Classroom'` justo después de `'Subject'`:

```ts
export type AppSubjects =
  | 'AcademicYear'
  | 'Grade'
  | 'Section'
  | 'Subject'
  | 'Classroom'
  | 'User'
  // ... resto sin cambios
```

- [ ] **Step 12: Agregar las reglas de CASL en `ability.factory.ts`**

En el bloque de `directivo` (`can('manage', [...])`), agregar `'Classroom'` junto a `'Subject'`:

```ts
    if (roles.includes('directivo')) {
      can('manage', [
        'AcademicYear',
        'Grade',
        'Section',
        'Subject',
        'Classroom',
        'User',
        // ... resto sin cambios
```

En el bloque compartido de lectura (docente/secretaria/estudiante/padre_tutor, `can('read', [...])`), agregar `'Classroom'` junto a `'Schedule'`:

```ts
      can('read', [
        'AcademicYear',
        'Grade',
        'Section',
        'Subject',
        'Classroom',
        'Enrollment',
        // ... resto sin cambios
```

(`admin_institucion` ya cubre `'Classroom'` con su `can('manage', 'all')` existente — sin cambios ahí. `secretaria` no gana `'Classroom'` en su `manage` propio, igual que hoy no tiene `'Schedule'`/`'Grade'`/`'Subject'`.)

- [ ] **Step 13: Agregar tests de CASL para `Classroom`**

En `apps/api/src/core/auth/casl/ability.factory.spec.ts`, agregar dentro del `describe` existente:

```ts
  it('directivo puede manage Classroom', () => {
    const ability = factory.createForUser(payload(['directivo']));
    expect(ability.can('create', 'Classroom')).toBe(true);
  });

  it('docente puede read Classroom pero no create', () => {
    const ability = factory.createForUser(payload(['docente']));
    expect(ability.can('read', 'Classroom')).toBe(true);
    expect(ability.can('create', 'Classroom')).toBe(false);
  });
```

- [ ] **Step 14: Correr los tests de CASL**

Run: `cd apps/api && npx jest ability.factory.spec.ts`
Expected: PASS (todos los tests, incluidos los 2 nuevos)

- [ ] **Step 15: Registrar todo en `academic.module.ts`**

Agregar los imports correspondientes (`ClassroomsController`, `CreateClassroomUseCase`, `ListClassroomsUseCase`, `ClassroomRepositoryPort`, `TypeOrmClassroomRepository`) y:

```ts
@Module({
  controllers: [AcademicYearsController, GradesController, SectionsController, SubjectsController, PeriodsController, ClassroomsController],
  providers: [
    // ... providers existentes sin cambios
    CreateClassroomUseCase,
    ListClassroomsUseCase,
    // ... resto de providers existentes
    { provide: ClassroomRepositoryPort, useClass: TypeOrmClassroomRepository },
  ],
  exports: [
    SubjectRepositoryPort,
    SectionRepositoryPort,
    AcademicYearRepositoryPort,
    GradeRepositoryPort,
    PeriodRepositoryPort,
    ClassroomRepositoryPort,
  ],
})
export class AcademicModule {}
```

- [ ] **Step 16: Correr toda la suite del módulo `academic` y de `casl`**

Run: `cd apps/api && npx jest modules/academic core/auth/casl`
Expected: PASS (todos los tests)

- [ ] **Step 17: Commit**

```bash
git add apps/api/src/modules/academic apps/api/src/core/auth/casl
git commit -m "feat(academic): casos de uso, controller y permisos CASL para Classroom"
```

---

### Task 3: `Schedule` — campo `classroomId` y filtro de repositorio

**Files:**
- Modify: `apps/api/src/modules/schedule/domain/entities/schedule.entity.ts`
- Modify: `apps/api/src/modules/schedule/domain/entities/schedule.entity.spec.ts`
- Modify: `apps/api/src/modules/schedule/application/ports/schedule.repository.port.ts`
- Modify: `apps/api/src/modules/schedule/infrastructure/entities/schedule.orm-entity.ts`
- Modify: `apps/api/src/modules/schedule/infrastructure/repositories/typeorm-schedule.repository.ts`

**Interfaces:**
- Consumes: columna `schedules.classroom_id` (Task 1).
- Produces: `Schedule.classroomId: string | null` (último parámetro del constructor, default `null`), `ScheduleFilter.classroomId?: string`.

- [ ] **Step 1: Extender el test de `Schedule` con el nuevo campo**

Agregar al final de `apps/api/src/modules/schedule/domain/entities/schedule.entity.spec.ts` (dentro del `describe` existente):

```ts
  it('classroomId es null por defecto', () => {
    expect(build().classroomId).toBeNull();
  });

  it('acepta un classroomId explícito', () => {
    const schedule = new Schedule(
      'sched-1',
      'section-1',
      'subject-1',
      'teacher-1',
      'year-1',
      'lunes',
      '08:00',
      '09:00',
      false,
      'classroom-1',
    );
    expect(schedule.classroomId).toBe('classroom-1');
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest schedule.entity.spec.ts`
Expected: FAIL — `classroomId` no existe en `Schedule` (TypeScript no compila / `undefined` en vez de `null`/`'classroom-1'`)

- [ ] **Step 3: Agregar `classroomId` al constructor de `Schedule`**

```ts
// apps/api/src/modules/schedule/domain/entities/schedule.entity.ts
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
    public readonly classroomId: string | null = null,
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

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest schedule.entity.spec.ts`
Expected: PASS (todos los tests, incluidos los 2 nuevos)

- [ ] **Step 5: Agregar `classroomId` al `ScheduleFilter`**

```ts
// apps/api/src/modules/schedule/application/ports/schedule.repository.port.ts
import { DayOfWeek, Schedule } from '../../domain/entities/schedule.entity';

export interface ScheduleFilter {
  sectionId?: string;
  teacherId?: string;
  academicYearId?: string;
  dayOfWeek?: DayOfWeek;
  classroomId?: string;
}

export abstract class ScheduleRepositoryPort {
  abstract findAll(filter?: ScheduleFilter): Promise<Schedule[]>;
  abstract findById(id: string): Promise<Schedule | null>;
  abstract save(schedule: Schedule): Promise<void>;
}
```

- [ ] **Step 6: Agregar la columna a `ScheduleOrmEntity`**

En `apps/api/src/modules/schedule/infrastructure/entities/schedule.orm-entity.ts`, agregar después de `isVirtual`:

```ts
  @Column({ name: 'classroom_id', nullable: true })
  classroomId: string | null;
```

- [ ] **Step 7: Actualizar `TypeOrmScheduleRepository` (filtro, save, toDomain)**

```ts
// apps/api/src/modules/schedule/infrastructure/repositories/typeorm-schedule.repository.ts
  async findAll(filter?: ScheduleFilter): Promise<Schedule[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.sectionId && { sectionId: filter.sectionId }),
        ...(filter?.teacherId && { teacherId: filter.teacherId }),
        ...(filter?.academicYearId && { academicYearId: filter.academicYearId }),
        ...(filter?.dayOfWeek && { dayOfWeek: filter.dayOfWeek }),
        ...(filter?.classroomId && { classroomId: filter.classroomId }),
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
      classroomId: schedule.classroomId,
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
      row.classroomId,
    );
  }
```

(Solo se reemplazan estos 4 métodos; el resto del archivo — imports, constructor — queda igual.)

- [ ] **Step 8: Correr toda la suite del módulo `schedule`**

Run: `cd apps/api && npx jest modules/schedule`
Expected: PASS (todos los tests existentes siguen pasando)

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/schedule
git commit -m "feat(schedule): agregar classroomId opcional a Schedule y su filtro de repositorio"
```

---

### Task 4: Detección de conflicto de aula en `CreateScheduleUseCase`

**Files:**
- Modify: `apps/api/src/modules/schedule/application/use-cases/create-schedule.use-case.ts`
- Create: `apps/api/src/modules/schedule/application/use-cases/create-schedule.use-case.spec.ts`
- Modify: `apps/api/src/modules/schedule/interface/dtos/create-schedule.dto.ts`

**Interfaces:**
- Consumes: `Schedule.classroomId`, `ScheduleFilter.classroomId` (Task 3).
- Produces: `CreateScheduleUseCase.execute(input: CreateScheduleInput)` acepta `classroomId?: string` y lanza `ConflictException('El aula ya tiene otro horario asignado en ese rango')` si hay solape.

**Nota:** este módulo no tenía spec para `CreateScheduleUseCase` — este task lo crea desde cero, cubriendo el caso base (sin aula) y los dos casos de conflicto de aula del spec. No se agrega cobertura de los chequeos de docente/sección ya existentes — eso queda fuera de este task (no es parte del cambio).

- [ ] **Step 1: Escribir el spec de `CreateScheduleUseCase` (caso base + conflicto de aula)**

```ts
// apps/api/src/modules/schedule/application/use-cases/create-schedule.use-case.spec.ts
import { ConflictException } from '@nestjs/common';
import { CreateScheduleUseCase } from './create-schedule.use-case';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { User } from '../../../identity/domain/entities/user.entity';

describe('CreateScheduleUseCase', () => {
  const schedules: jest.Mocked<ScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new CreateScheduleUseCase(schedules, users);

  const teacher = () => new User('teacher-1', 't@x.com', 'hash', 'Ana', 'Pérez', ['docente'], 'active');

  const baseInput = {
    sectionId: 'section-1',
    subjectId: 'subject-1',
    teacherId: 'teacher-1',
    academicYearId: 'year-1',
    dayOfWeek: 'lunes' as const,
    startTime: '08:00',
    endTime: '09:00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    users.findById.mockResolvedValue(teacher());
    schedules.findAll.mockResolvedValue([]);
  });

  it('crea el horario cuando no hay classroomId', async () => {
    const result = await useCase.execute(baseInput);
    expect(result.classroomId).toBeNull();
    expect(schedules.save).toHaveBeenCalled();
  });

  it('lanza ConflictException si el aula ya tiene otro horario solapado el mismo día/año', async () => {
    const existing = new Schedule(
      'sched-existing',
      'other-section',
      'other-subject',
      'other-teacher',
      'year-1',
      'lunes',
      '08:30',
      '09:30',
      false,
      'classroom-1',
    );
    schedules.findAll.mockImplementation(async (filter) => {
      if (filter?.classroomId === 'classroom-1') return [existing];
      return [];
    });

    await expect(useCase.execute({ ...baseInput, classroomId: 'classroom-1' })).rejects.toThrow(
      'El aula ya tiene otro horario asignado en ese rango',
    );
    expect(schedules.save).not.toHaveBeenCalled();
  });

  it('no lanza si el aula tiene horarios en otro rango sin solape', async () => {
    const existing = new Schedule(
      'sched-existing',
      'other-section',
      'other-subject',
      'other-teacher',
      'year-1',
      'lunes',
      '10:00',
      '11:00',
      false,
      'classroom-1',
    );
    schedules.findAll.mockImplementation(async (filter) => {
      if (filter?.classroomId === 'classroom-1') return [existing];
      return [];
    });

    const result = await useCase.execute({ ...baseInput, classroomId: 'classroom-1' });
    expect(result.classroomId).toBe('classroom-1');
    expect(schedules.save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el spec y verificar que falla**

Run: `cd apps/api && npx jest create-schedule.use-case.spec.ts`
Expected: FAIL — el primer test debería pasar (comportamiento ya existente), pero los dos de `classroomId` fallan porque `CreateScheduleUseCase` todavía no acepta ni valida ese campo (TypeScript no compila el objeto extra, o el conflicto nunca se detecta)

- [ ] **Step 3: Agregar la validación de conflicto de aula**

```ts
// apps/api/src/modules/schedule/application/use-cases/create-schedule.use-case.ts
import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { DayOfWeek, Schedule } from '../../domain/entities/schedule.entity';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { isExclusionViolation } from '../../../../core/database/postgres-error.util';

export interface CreateScheduleInput {
  sectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  classroomId?: string;
}

@Injectable()
export class CreateScheduleUseCase {
  constructor(
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
  ) {}

  async execute(input: CreateScheduleInput): Promise<Schedule> {
    const teacher = await this.users.findById(input.teacherId);
    if (!teacher) {
      throw new NotFoundException(`No existe el usuario "${input.teacherId}"`);
    }
    if (!teacher.hasRole('docente')) {
      throw new BadRequestException('El usuario no tiene rol "docente"');
    }

    let schedule: Schedule;
    try {
      schedule = new Schedule(
        randomUUID(),
        input.sectionId,
        input.subjectId,
        input.teacherId,
        input.academicYearId,
        input.dayOfWeek,
        input.startTime,
        input.endTime,
        false,
        input.classroomId ?? null,
      );
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    const teacherSameDay = await this.schedules.findAll({
      teacherId: input.teacherId,
      dayOfWeek: input.dayOfWeek,
    });
    if (teacherSameDay.some((existing) => existing.overlaps(schedule))) {
      throw new ConflictException('El docente ya tiene otro horario asignado en ese rango');
    }

    const sectionSameDay = await this.schedules.findAll({
      sectionId: input.sectionId,
      academicYearId: input.academicYearId,
      dayOfWeek: input.dayOfWeek,
    });
    if (sectionSameDay.some((existing) => existing.overlaps(schedule))) {
      throw new ConflictException('La sección ya tiene otra asignatura asignada en ese rango');
    }

    if (input.classroomId) {
      const classroomSameDay = await this.schedules.findAll({
        classroomId: input.classroomId,
        academicYearId: input.academicYearId,
        dayOfWeek: input.dayOfWeek,
      });
      if (classroomSameDay.some((existing) => existing.overlaps(schedule))) {
        throw new ConflictException('El aula ya tiene otro horario asignado en ese rango');
      }
    }

    try {
      await this.schedules.save(schedule);
    } catch (err) {
      if (isExclusionViolation(err)) {
        throw new ConflictException('El horario se superpone con otro ya existente');
      }
      throw err;
    }
    return schedule;
  }
}
```

- [ ] **Step 4: Correr el spec y verificar que pasa**

Run: `cd apps/api && npx jest create-schedule.use-case.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Agregar `classroomId` opcional al DTO**

```ts
// apps/api/src/modules/schedule/interface/dtos/create-schedule.dto.ts
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { DayOfWeek } from '../../domain/entities/schedule.entity';

const KNOWN_DAYS: DayOfWeek[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateScheduleDto {
  @IsUUID()
  sectionId: string;

  @IsUUID()
  subjectId: string;

  @IsUUID()
  teacherId: string;

  @IsUUID()
  academicYearId: string;

  @IsIn(KNOWN_DAYS)
  dayOfWeek: DayOfWeek;

  @Matches(TIME_PATTERN, { message: 'startTime debe tener formato HH:mm' })
  startTime: string;

  @Matches(TIME_PATTERN, { message: 'endTime debe tener formato HH:mm' })
  endTime: string;

  @IsOptional()
  @IsUUID()
  classroomId?: string;
}
```

- [ ] **Step 6: Correr toda la suite del módulo `schedule`**

Run: `cd apps/api && npx jest modules/schedule`
Expected: PASS (todos los tests)

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/schedule
git commit -m "feat(schedule): detectar conflicto de aula al crear un horario"
```

---

### Task 5: Frontend — catálogo de aulas (pantalla + hook + nav)

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Create: `apps/web/src/app/api/academic/classrooms/route.ts`
- Create: `apps/web/src/features/academic/use-classrooms.ts`
- Create: `apps/web/src/features/academic/components/classrooms-list.tsx`
- Create: `apps/web/src/features/academic/components/create-classroom-form.tsx`
- Create: `apps/web/src/app/(dashboard)/academic/classrooms/page.tsx`
- Modify: `apps/web/src/lib/nav-config.ts`

**Interfaces:**
- Consumes: `GET/POST academic/classrooms` (Task 2).
- Produces: `Classroom` (shared-types), `useClassrooms()`, `useCreateClassroom()` — consumidos por Task 6.

- [ ] **Step 1: Agregar el tipo `Classroom` a shared-types**

En `packages/shared-types/src/index.ts`, agregar junto a la interfaz `Subject` (línea ~78-82):

```ts
export interface Classroom {
  id: string;
  name: string;
  capacity: number;
}
```

- [ ] **Step 2: Crear la ruta BFF**

```ts
// apps/web/src/app/api/academic/classrooms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Classroom } from '@eduapp/shared-types';

export async function GET() {
  const classrooms = await serverApiFetch<Classroom[]>('/academic/classrooms');
  if (classrooms === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(classrooms);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const classroom = await serverApiFetch<Classroom>('/academic/classrooms', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (classroom === null) return NextResponse.json({ message: 'No se pudo crear' }, { status: 400 });
  return NextResponse.json(classroom, { status: 201 });
}
```

- [ ] **Step 3: Crear el hook `use-classrooms.ts`**

```ts
// apps/web/src/features/academic/use-classrooms.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Classroom } from '@eduapp/shared-types';

async function fetchClassrooms(): Promise<Classroom[]> {
  const res = await fetch('/api/academic/classrooms');
  if (!res.ok) throw new Error('No se pudieron cargar las aulas');
  return res.json();
}

export interface CreateClassroomInput {
  name: string;
  capacity: number;
}

async function createClassroom(input: CreateClassroomInput): Promise<Classroom> {
  const res = await fetch('/api/academic/classrooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear el aula');
  return res.json();
}

export function useClassrooms() {
  return useQuery({ queryKey: ['classrooms'], queryFn: fetchClassrooms });
}

export function useCreateClassroom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClassroom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}
```

- [ ] **Step 4: Crear el componente de listado**

```tsx
// apps/web/src/features/academic/components/classrooms-list.tsx
'use client';

import { useClassrooms } from '../use-classrooms';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

export function ClassroomsList() {
  const { data: classrooms, isLoading, error } = useClassrooms();

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las aulas.</p>;
  if (!classrooms || classrooms.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay aulas.</p>;
  }

  return (
    <ul className="space-y-2">
      {classrooms.map((classroom) => (
        <Card key={classroom.id} className="flex items-center justify-between py-3">
          <p className="font-medium">{classroom.name}</p>
          <span className="text-xs uppercase text-muted-foreground">Capacidad: {classroom.capacity}</span>
        </Card>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Crear el formulario de alta**

```tsx
// apps/web/src/features/academic/components/create-classroom-form.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useCreateClassroom } from '../use-classrooms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateClassroomForm() {
  const createClassroom = useCreateClassroom();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedCapacity = Number(capacity);
    if (!name || !parsedCapacity || parsedCapacity <= 0) return;
    createClassroom.mutate(
      { name, capacity: parsedCapacity },
      { onSuccess: () => { setName(''); setCapacity(''); } },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          placeholder="Aula 201"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="capacity">Capacidad</Label>
        <Input
          id="capacity"
          type="number"
          min={1}
          placeholder="30"
          required
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createClassroom.isPending}>
        {createClassroom.isPending ? 'Creando...' : 'Crear'}
      </Button>
      {createClassroom.isError && (
        <p className="w-full text-sm text-destructive">No se pudo crear el aula.</p>
      )}
    </form>
  );
}
```

- [ ] **Step 6: Crear la página `/academic/classrooms`**

```tsx
// apps/web/src/app/(dashboard)/academic/classrooms/page.tsx
import { ClassroomsList } from '@/features/academic/components/classrooms-list';
import { CreateClassroomForm } from '@/features/academic/components/create-classroom-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAcademic } from '@/lib/permissions';

export default async function ClassroomsPage() {
  const user = await getCurrentUser();
  const canManage = canManageAcademic(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          Aulas físicas de la institución, usadas para detectar cruces de horario.
        </p>
      </div>

      {canManage && <CreateClassroomForm />}
      <ClassroomsList />
    </main>
  );
}
```

- [ ] **Step 7: Agregar el link al menú de navegación**

En `apps/web/src/lib/nav-config.ts`: agregar `DoorOpen` al import de `lucide-react` (junto a los demás íconos), y agregar el link dentro del grupo `academico`, después de "Asignaturas":

```ts
import {
  LayoutDashboard,
  CalendarRange,
  GraduationCap,
  LayoutGrid,
  BookOpen,
  DoorOpen,
  Clock,
  // ... resto de imports sin cambios
} from 'lucide-react';
```

```ts
      { href: '/academic/subjects', label: 'Asignaturas', icon: BookOpen, roles: ADMIN },
      { href: '/academic/classrooms', label: 'Aulas', icon: DoorOpen, roles: ADMIN },
      { href: '/schedule', label: 'Horarios', icon: Clock, roles: ADMIN_SECRETARIA_DOCENTE },
```

- [ ] **Step 8: Verificación en vivo**

Levantar el backend (`cd apps/api && npm run start:dev`) y el frontend (`cd apps/web && npm run dev`), iniciar sesión como `admin@colegio-demo.test` / `Demo12345!` en el tenant `colegio-demo`, navegar a `/academic/classrooms`, crear un aula ("Aula 201", capacidad 30) y confirmar que aparece en la lista.

- [ ] **Step 9: Commit**

```bash
git add packages/shared-types/src/index.ts apps/web/src/app/api/academic/classrooms \
  apps/web/src/features/academic/use-classrooms.ts \
  apps/web/src/features/academic/components/classrooms-list.tsx \
  apps/web/src/features/academic/components/create-classroom-form.tsx \
  apps/web/src/app/\(dashboard\)/academic/classrooms/page.tsx \
  apps/web/src/lib/nav-config.ts
git commit -m "feat(academic): pantalla de gestión de aulas"
```

---

### Task 6: Frontend — aula en el formulario y la grilla de horarios

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify: `apps/web/src/features/schedule/use-schedules.ts`
- Modify: `apps/web/src/features/schedule/components/create-schedule-form.tsx`
- Modify: `apps/web/src/features/schedule/components/schedule-grid.tsx`

**Interfaces:**
- Consumes: `useClassrooms()` (Task 5), `Schedule.classroomId` (backend, Task 3/4).
- Produces: `Schedule.classroomId` en shared-types; `CreateScheduleInput.classroomId?: string`.

- [ ] **Step 1: Agregar `classroomId` a `Schedule` en shared-types**

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
  classroomId: string | null;
}
```

- [ ] **Step 2: Agregar `classroomId` a `CreateScheduleInput`**

En `apps/web/src/features/schedule/use-schedules.ts`:

```ts
export interface CreateScheduleInput {
  sectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  classroomId?: string;
}
```

(El resto del archivo — `createSchedule`, `useCreateSchedule`, etc. — no cambia: `classroomId` viaja tal cual dentro del `input` serializado.)

- [ ] **Step 3: Agregar el select de aula al formulario de creación**

En `apps/web/src/features/schedule/components/create-schedule-form.tsx`:

Agregar el import y el hook, junto a los demás:

```ts
import { useClassrooms } from '@/features/academic/use-classrooms';
```

```ts
  const { data: classrooms } = useClassrooms();
```

Agregar el estado, junto a los demás `useState`:

```ts
  const [classroomId, setClassroomId] = useState('');
```

Incluir `classroomId` en el payload de creación (solo si no está vacío):

```ts
      const schedule = await createSchedule.mutateAsync({
        academicYearId,
        sectionId,
        subjectId,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        ...(classroomId && { classroomId }),
      });
```

Agregar el select, después del bloque de "Docente" (después de la línea que cierra ese `<div>`):

```tsx
      <div className="space-y-1.5">
        <Label htmlFor="classroomId">Aula</Label>
        <select
          id="classroomId"
          value={classroomId}
          onChange={(e) => setClassroomId(e.target.value)}
          className="flex h-10 w-36 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">Sin aula asignada</option>
          {classrooms?.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>
              {classroom.name}
            </option>
          ))}
        </select>
      </div>
```

Actualizar el texto de ayuda del error para mencionar el aula también:

```tsx
      {createSchedule.isError && (
        <p className="w-full text-sm text-destructive">
          No se pudo crear el horario (¿superpone con otro del docente, la sección o el aula?).
        </p>
      )}
```

- [ ] **Step 4: Mostrar el aula en la grilla de horarios**

En `apps/web/src/features/schedule/components/schedule-grid.tsx`:

Agregar el import y el hook:

```ts
import { useClassrooms } from '@/features/academic/use-classrooms';
```

```ts
  const { data: classrooms } = useClassrooms();
```

Agregar el mapa, junto a los otros `Map`:

```ts
  const classroomNameById = new Map(classrooms?.map((c) => [c.id, c.name]));
```

Mostrar el nombre del aula cuando `classroomId` no es null, dentro del bloque `match ? (...)`, después del párrafo del docente y antes de `VirtualClassControls`:

```tsx
                            <p className="text-xs text-muted-foreground">
                              {teacherNameById.get(match.teacherId) ?? match.teacherId}
                            </p>
                            {match.classroomId && (
                              <p className="text-xs text-muted-foreground">
                                {classroomNameById.get(match.classroomId) ?? match.classroomId}
                              </p>
                            )}
                            {match.isVirtual && match.dayOfWeek === todaysDay && (
```

- [ ] **Step 5: Verificación en vivo**

Con backend y frontend levantados: ir a `/schedule`, crear un horario asignando el aula "Aula 201" (creada en Task 5) a una sección y horario libres, confirmar que se crea. Crear un segundo horario para **otra** sección con el **mismo** día/rango horario y la **misma** aula, y confirmar que el formulario muestra el error de conflicto. Luego, en la grilla (`ScheduleGrid`, eligiendo la primera sección), confirmar que aparece "Aula 201" debajo del nombre del docente.

- [ ] **Step 6: Correr el typecheck de ambos paquetes**

Run: `cd apps/web && npx tsc --noEmit && cd ../../packages/shared-types && npx tsc --noEmit`
Expected: sin errores

- [ ] **Step 7: Commit**

```bash
git add packages/shared-types/src/index.ts apps/web/src/features/schedule
git commit -m "feat(schedule): seleccionar y mostrar aula en el formulario y la grilla de horarios"
```
