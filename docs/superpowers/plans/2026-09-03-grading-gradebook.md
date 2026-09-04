# Calificaciones Ponderadas + Boletín por Estudiante Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un boletín de calificaciones por estudiante (materia × periodo, con nota ponderada configurable e inasistencia por materia), reemplazando el flujo actual de solo-docente por uno buscable desde administración, en dos fases: asistencia por materia primero, notas ponderadas + UI después.

**Architecture:** Monorepo NestJS (hexagonal: domain/application/infrastructure/interface por módulo) + Next.js App Router. Fase 1 extiende `attendance` (agrega `scheduleId`) y ajusta el flujo de toma de asistencia. Fase 2 agrega `Período` (módulo `academic`) y `GradeWeightConfig`+`GradeCalculationService`+endpoints de `gradebook` (módulo `grading`), reescribe `Evaluation` (category/periodId/label en vez de type/period), y construye la UI de boletín + 2 modales sobre lo existente.

**Tech Stack:** NestJS 10 + TypeORM (Postgres, migraciones SQL crudas) + class-validator/class-transformer + CASL (`@CheckPolicies`) · Next.js 14 App Router + React Query + TailwindCSS (sin librería de componentes, primitivos propios en `components/ui`) · Jest para specs de backend.

**Spec:** [docs/superpowers/specs/2026-09-03-grading-gradebook-design.md](../specs/2026-09-03-grading-gradebook-design.md)

## Global Constraints

- Escala de notas: toda nota se normaliza a 0.0–5.0 para combinarse (`(score / maxScore) * 5`).
- Pesos de categoría por defecto: `actividad` 0.65, `evaluacion_bimestral` 0.25, `disciplina` 0.10 — deben sumar 1 (tolerancia de punto flotante `0.001`).
- `GradeCategory` es un union fijo de 3 miembros: `'actividad' | 'evaluacion_bimestral' | 'disciplina'` — no configurable en cantidad, solo los pesos lo son.
- Nota de un periodo: si ninguna categoría tiene una nota cargada aún → `grade: null` (se muestra `"-"`). Si al menos una categoría tiene datos → se promedian solo las categorías con datos, redistribuyendo su peso proporcionalmente entre ellas (`isPartial: true` si no las 3 tienen datos).
- Nota Acumulada: promedio ponderado literal de la nota de cada `Período` configurado (usando su `weight`), **sin** redistribuir — un periodo sin nota entra como `0`.
- Inasistencia: cuenta de `AttendanceRecord` con `status = 'ausente'`, agrupada por materia (vía `Schedule.subjectId`) y por periodo (vía el rango `startDate`–`endDate` del `Período`). Acumulada = suma simple entre periodos.
- No se introduce ningún rol/subject de CASL nuevo: `Período`/`GradeWeightConfig` reusan `'AcademicYear'` (managed por `admin_institucion`/`directivo`, solo lectura para el resto); los 4 endpoints de `gradebook` reusan `'Grading'` (managed por `admin_institucion`/`directivo`/`docente`, igual que `Evaluations`/`Scores` hoy).
- Sin cache ni tabla materializada — todo se calcula al vuelo, un query agregado por colección (no por materia/periodo).
- Cada migración nueva usa el próximo timestamp libre en `apps/api/src/core/database/migrations/tenant/` (el último hoy es `1700000000052`); no hace falta registrar nada aparte, TypeORM las descubre por glob (`tenant.datasource.ts:37`).

---

## Fase 1 — Asistencia por materia

### Task 1: `AttendanceRecord` gana `scheduleId` (dominio + persistencia)

**Files:**
- Create: `apps/api/src/core/database/migrations/tenant/1700000000053-AddScheduleIdToAttendanceRecords.ts`
- Modify: `apps/api/src/modules/attendance/domain/entities/attendance-record.entity.ts`
- Modify: `apps/api/src/modules/attendance/application/ports/attendance-record.repository.port.ts`
- Modify: `apps/api/src/modules/attendance/infrastructure/entities/attendance-record.orm-entity.ts`
- Modify: `apps/api/src/modules/attendance/infrastructure/repositories/typeorm-attendance-record.repository.ts`

**Interfaces:**
- Produces: `AttendanceRecord` constructor `(id: string, enrollmentId: string, scheduleId: string | null, date: string, status: AttendanceStatus)`. `AttendanceFilter.scheduleId?: string`. Ambos consumidos por Task 2 y por la Fase 2 (cálculo de inasistencia).

- [ ] **Step 1: Escribir la migración**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `schedule_id` liga cada asistencia a una clase concreta (materia+sección+
 * día+hora) en vez de solo a la sección del día — habilita contar
 * inasistencia por materia. Los registros previos a esta migración quedan
 * con `schedule_id` nulo (no se migran retroactivamente); Postgres no trata
 * los NULL como iguales en un índice único, así que conviven sin romper el
 * nuevo constraint.
 */
export class AddScheduleIdToAttendanceRecords1700000000053 implements MigrationInterface {
  name = 'AddScheduleIdToAttendanceRecords1700000000053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      ADD COLUMN "schedule_id" uuid REFERENCES "schedules"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`DROP INDEX "IDX_attendance_records_enrollment_date"`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_attendance_records_enrollment_schedule_date"
      ON "attendance_records" ("enrollment_id", "schedule_id", "date")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_records_schedule_date"
      ON "attendance_records" ("schedule_id", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_attendance_records_schedule_date"`);
    await queryRunner.query(`DROP INDEX "IDX_attendance_records_enrollment_schedule_date"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_attendance_records_enrollment_date"
      ON "attendance_records" ("enrollment_id", "date")
    `);
    await queryRunner.query(`ALTER TABLE "attendance_records" DROP COLUMN "schedule_id"`);
  }
}
```

- [ ] **Step 2: Correr la migración contra la base de desarrollo**

Run: `cd apps/api && pnpm migration:run:tenant:all`
Expected: log muestra `AddScheduleIdToAttendanceRecords1700000000053` aplicada sin error.

- [ ] **Step 3: Actualizar la entidad de dominio**

En `attendance-record.entity.ts`, agregar `scheduleId` como segundo parámetro posicional:

```ts
export type AttendanceStatus = 'presente' | 'ausente' | 'tarde' | 'justificado';

export class AttendanceRecord {
  constructor(
    public readonly id: string,
    public readonly enrollmentId: string,
    public readonly scheduleId: string | null,
    public readonly date: string,
    public status: AttendanceStatus,
  ) {}
}
```

- [ ] **Step 4: Actualizar el puerto**

En `attendance-record.repository.port.ts`, agregar `scheduleId` al filtro:

```ts
import { AttendanceRecord } from '../../domain/entities/attendance-record.entity';

export interface AttendanceFilter {
  sectionId?: string;
  academicYearId?: string;
  scheduleId?: string;
  date?: string;
  enrollmentId?: string;
}

export abstract class AttendanceRecordRepositoryPort {
  abstract findAll(filter?: AttendanceFilter): Promise<AttendanceRecord[]>;
  /** Upsert por (enrollmentId, scheduleId, date): si ya existe, actualiza el status. */
  abstract upsertMany(records: AttendanceRecord[]): Promise<void>;
}
```

- [ ] **Step 5: Actualizar la orm-entity**

En `attendance-record.orm-entity.ts`, agregar la columna:

```ts
import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AttendanceStatus } from '../../domain/entities/attendance-record.entity';

@Entity({ name: 'attendance_records' })
export class AttendanceRecordOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'enrollment_id' })
  enrollmentId: string;

  @Column({ name: 'schedule_id', nullable: true })
  scheduleId: string | null;

  @Column({ type: 'date' })
  date: string;

  @Column()
  status: AttendanceStatus;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
```

- [ ] **Step 6: Actualizar el repositorio**

En `typeorm-attendance-record.repository.ts`, agregar el filtro por `scheduleId`, mapear la columna, y ajustar el `conflictPaths` del upsert:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  AttendanceFilter,
  AttendanceRecordRepositoryPort,
} from '../../application/ports/attendance-record.repository.port';
import { AttendanceRecord } from '../../domain/entities/attendance-record.entity';
import { AttendanceRecordOrmEntity } from '../entities/attendance-record.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmAttendanceRecordRepository extends AttendanceRecordRepositoryPort {
  private readonly repo: Repository<AttendanceRecordOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) private readonly dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AttendanceRecordOrmEntity);
  }

  async findAll(filter?: AttendanceFilter): Promise<AttendanceRecord[]> {
    const query = this.repo.createQueryBuilder('ar').orderBy('ar.date', 'DESC');

    if (filter?.sectionId || filter?.academicYearId) {
      query.innerJoin('enrollments', 'e', 'e.id = ar.enrollment_id');
      if (filter.sectionId) query.andWhere('e.section_id = :sectionId', filter);
      if (filter.academicYearId) {
        query.andWhere('e.academic_year_id = :academicYearId', filter);
      }
    }
    if (filter?.enrollmentId) {
      query.andWhere('ar.enrollment_id = :enrollmentId', filter);
    }
    if (filter?.scheduleId) {
      query.andWhere('ar.schedule_id = :scheduleId', filter);
    }
    if (filter?.date) {
      query.andWhere('ar.date = :date', filter);
    }

    const rows = await query.getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async upsertMany(records: AttendanceRecord[]): Promise<void> {
    if (records.length === 0) return;
    await this.repo.upsert(
      records.map((r) => ({
        id: r.id,
        enrollmentId: r.enrollmentId,
        scheduleId: r.scheduleId,
        date: r.date,
        status: r.status,
      })),
      { conflictPaths: ['enrollmentId', 'scheduleId', 'date'], skipUpdateIfNoValuesChanged: true },
    );
  }

  private toDomain(row: AttendanceRecordOrmEntity): AttendanceRecord {
    return new AttendanceRecord(row.id, row.enrollmentId, row.scheduleId, row.date, row.status);
  }
}
```

- [ ] **Step 7: Verificar que compila**

Run: `cd apps/api && pnpm exec tsc --noEmit`
Expected: errores en `record-attendance.use-case.ts` (todavía construye `AttendanceRecord` con la firma vieja) — se resuelven en el Task 2. Ningún otro error nuevo.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/core/database/migrations/tenant/1700000000053-AddScheduleIdToAttendanceRecords.ts apps/api/src/modules/attendance/domain apps/api/src/modules/attendance/application/ports apps/api/src/modules/attendance/infrastructure
git commit -m "feat(attendance): agrega scheduleId a AttendanceRecord"
```

### Task 2: `RecordAttendanceUseCase` pasa a tomarse por horario (materia)

**Files:**
- Modify: `apps/api/src/modules/attendance/application/use-cases/record-attendance.use-case.ts`
- Create: `apps/api/src/modules/attendance/application/use-cases/record-attendance.use-case.spec.ts`

**Interfaces:**
- Consumes: `AttendanceRecord` constructor de Task 1. `ScheduleRepositoryPort.findById(id): Promise<Schedule | null>` (ya existe, `apps/api/src/modules/schedule/application/ports/schedule.repository.port.ts`). `ClassCancellationRepositoryPort.findOne(scheduleId, date): Promise<ClassCancellation | null>` (ya existe). `EnrollmentRepositoryPort.findAll(filter)` (ya existe).
- Produces: `RecordAttendanceInput { scheduleId: string; date: string; records: RecordAttendanceEntry[] }` (reemplaza `sectionId`+`academicYearId`+`date`). Consumido por Task 3 (DTO) y Task 4 (frontend).

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecordAttendanceUseCase } from './record-attendance.use-case';
import { AttendanceRecordRepositoryPort } from '../ports/attendance-record.repository.port';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { ScheduleRepositoryPort } from '../../../schedule/application/ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../../../schedule/application/ports/class-cancellation.repository.port';
import { Schedule } from '../../../schedule/domain/entities/schedule.entity';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { ClassCancellation } from '../../../schedule/domain/entities/class-cancellation.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('RecordAttendanceUseCase', () => {
  const attendance: jest.Mocked<AttendanceRecordRepositoryPort> = {
    findAll: jest.fn(),
    upsertMany: jest.fn(),
  };
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
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
  const enrollmentAccess = { canTeacherAccessSection: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new RecordAttendanceUseCase(attendance, enrollments, schedules, cancellations, enrollmentAccess);

  const schedule = new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00');
  const docente: JwtPayload = { sub: 'teacher-1', roles: ['docente'], tenantId: 't1' } as JwtPayload;
  const otroDocente: JwtPayload = { sub: 'teacher-2', roles: ['docente'], tenantId: 't1' } as JwtPayload;

  beforeEach(() => {
    jest.clearAllMocks();
    schedules.findById.mockResolvedValue(schedule);
    cancellations.findOne.mockResolvedValue(null);
    enrollments.findAll.mockResolvedValue([
      new Enrollment('enr-1', 'student-1', 'section-1', 'year-1', 'active'),
    ]);
  });

  it('rechaza si el horario no existe', async () => {
    schedules.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ scheduleId: 'sched-x', date: '2026-03-02', records: [] }, docente),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza si un docente no es el titular del horario', async () => {
    await expect(
      useCase.execute(
        { scheduleId: 'sched-1', date: '2026-03-02', records: [{ enrollmentId: 'enr-1', status: 'presente' }] },
        otroDocente,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza si la clase de esa fecha está cancelada', async () => {
    cancellations.findOne.mockResolvedValue(
      new ClassCancellation('cancel-1', 'sched-1', '2026-03-02', 'teacher-1', null),
    );

    await expect(
      useCase.execute(
        { scheduleId: 'sched-1', date: '2026-03-02', records: [{ enrollmentId: 'enr-1', status: 'presente' }] },
        docente,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('guarda la asistencia ligada al horario cuando todo es válido', async () => {
    const result = await useCase.execute(
      { scheduleId: 'sched-1', date: '2026-03-02', records: [{ enrollmentId: 'enr-1', status: 'ausente' }] },
      docente,
    );

    expect(result).toHaveLength(1);
    expect(result[0].scheduleId).toBe('sched-1');
    expect(result[0].status).toBe('ausente');
    expect(attendance.upsertMany).toHaveBeenCalledTimes(1);
  });

  it('admin_institucion puede tomar asistencia de cualquier horario', async () => {
    const admin: JwtPayload = { sub: 'admin-1', roles: ['admin_institucion'], tenantId: 't1' } as JwtPayload;

    const result = await useCase.execute(
      { scheduleId: 'sched-1', date: '2026-03-02', records: [{ enrollmentId: 'enr-1', status: 'presente' }] },
      admin,
    );

    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `cd apps/api && pnpm test record-attendance.use-case`
Expected: FAIL — `RecordAttendanceUseCase` todavía tiene la firma vieja (constructor de 3 dependencias, input con `sectionId`).

- [ ] **Step 3: Reescribir el use case**

```ts
import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRecordRepositoryPort } from '../ports/attendance-record.repository.port';
import { AttendanceRecord, AttendanceStatus } from '../../domain/entities/attendance-record.entity';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { ScheduleRepositoryPort } from '../../../schedule/application/ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../../../schedule/application/ports/class-cancellation.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

const MANAGER_ROLES = ['admin_institucion', 'directivo'];

export interface RecordAttendanceEntry {
  enrollmentId: string;
  status: AttendanceStatus;
}

export interface RecordAttendanceInput {
  scheduleId: string;
  date: string;
  records: RecordAttendanceEntry[];
}

@Injectable()
export class RecordAttendanceUseCase {
  constructor(
    @Inject(AttendanceRecordRepositoryPort)
    private readonly attendance: AttendanceRecordRepositoryPort,
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
    @Inject(ClassCancellationRepositoryPort) private readonly cancellations: ClassCancellationRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(input: RecordAttendanceInput, currentUser: JwtPayload): Promise<AttendanceRecord[]> {
    const schedule = await this.schedules.findById(input.scheduleId);
    if (!schedule) {
      throw new NotFoundException(`No existe el horario "${input.scheduleId}"`);
    }

    // A diferencia de `canTeacherAccessSection` (usado en Evaluations/Scores,
    // más laxo: cualquier horario en la sección alcanza), acá un docente
    // solo puede tomar asistencia de SU propio horario — es una clase suya
    // concreta, no basta con tener algún horario en la sección.
    const isOwner = schedule.teacherId === currentUser.sub;
    const isManager = currentUser.roles.some((role) => MANAGER_ROLES.includes(role));
    const isDocente = currentUser.roles.includes('docente');
    if (isDocente && !isOwner && !isManager) {
      throw new ForbiddenException('Solo el docente asignado a ese horario puede tomar asistencia');
    }

    const cancelled = await this.cancellations.findOne(input.scheduleId, input.date);
    if (cancelled) {
      throw new BadRequestException('No se puede tomar asistencia de una clase cancelada');
    }

    const sectionEnrollments = await this.enrollments.findAll({
      sectionId: schedule.sectionId,
      academicYearId: schedule.academicYearId,
    });
    const validEnrollmentIds = new Set(sectionEnrollments.map((e) => e.id));

    const invalid = input.records.find((r) => !validEnrollmentIds.has(r.enrollmentId));
    if (invalid) {
      throw new BadRequestException(
        `La matrícula "${invalid.enrollmentId}" no pertenece a esa sección/año lectivo`,
      );
    }

    const records = input.records.map(
      (entry) =>
        new AttendanceRecord(randomUUID(), entry.enrollmentId, input.scheduleId, input.date, entry.status),
    );

    await this.attendance.upsertMany(records);
    return records;
  }
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `cd apps/api && pnpm test record-attendance.use-case`
Expected: PASS — los 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/attendance/application/use-cases/record-attendance.use-case.ts apps/api/src/modules/attendance/application/use-cases/record-attendance.use-case.spec.ts
git commit -m "feat(attendance): toma de asistencia por horario en vez de por sección/día"
```

### Task 3: DTOs, controller, wiring de módulos y shared-types

**Files:**
- Modify: `apps/api/src/modules/attendance/interface/dtos/record-attendance.dto.ts`
- Modify: `apps/api/src/modules/attendance/interface/dtos/list-attendance-query.dto.ts`
- Modify: `apps/api/src/modules/schedule/schedule.module.ts`
- Modify: `apps/api/src/modules/attendance/attendance.module.ts`
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Consumes: `RecordAttendanceInput`/`AttendanceFilter` de Tasks 1-2.
- Produces: `AttendanceRecord` (shared-types) con `scheduleId: string | null` — consumido por el frontend en Task 4.

- [ ] **Step 1: Actualizar `RecordAttendanceDto`**

```ts
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsUUID, ValidateNested } from 'class-validator';
import { AttendanceStatus } from '../../domain/entities/attendance-record.entity';

const KNOWN_STATUSES: AttendanceStatus[] = ['presente', 'ausente', 'tarde', 'justificado'];

class AttendanceEntryDto {
  @IsUUID()
  enrollmentId: string;

  @IsIn(KNOWN_STATUSES)
  status: AttendanceStatus;
}

export class RecordAttendanceDto {
  @IsUUID()
  scheduleId: string;

  @IsDateString()
  date: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  records: AttendanceEntryDto[];
}
```

- [ ] **Step 2: Actualizar `ListAttendanceQueryDto`**

```ts
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ListAttendanceQueryDto {
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
```

- [ ] **Step 3: Exportar los puertos de `ScheduleModule`**

`RecordAttendanceUseCase` necesita `ScheduleRepositoryPort` y `ClassCancellationRepositoryPort`, hoy no exportados (`ScheduleModule` solo exporta `TeacherSectionsService`). Agregar ambos al arreglo `exports`:

```ts
  exports: [TeacherSectionsService, ScheduleRepositoryPort, ClassCancellationRepositoryPort],
```

(el resto de `schedule.module.ts` no cambia).

- [ ] **Step 4: Importar `ScheduleModule` en `AttendanceModule`**

```ts
import { Module } from '@nestjs/common';
import { AttendanceController } from './interface/controllers/attendance.controller';
import { RecordAttendanceUseCase } from './application/use-cases/record-attendance.use-case';
import { ListAttendanceUseCase } from './application/use-cases/list-attendance.use-case';
import { AttendanceRecordRepositoryPort } from './application/ports/attendance-record.repository.port';
import { TypeOrmAttendanceRecordRepository } from './infrastructure/repositories/typeorm-attendance-record.repository';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [EnrollmentModule, ScheduleModule],
  controllers: [AttendanceController],
  providers: [
    RecordAttendanceUseCase,
    ListAttendanceUseCase,
    { provide: AttendanceRecordRepositoryPort, useClass: TypeOrmAttendanceRecordRepository },
  ],
  exports: [AttendanceRecordRepositoryPort],
})
export class AttendanceModule {}
```

- [ ] **Step 5: Actualizar `AttendanceRecord` en shared-types**

En `packages/shared-types/src/index.ts`, reemplazar la interfaz existente (línea ~126):

```ts
export interface AttendanceRecord {
  id: string;
  enrollmentId: string;
  scheduleId: string | null;
  date: string;
  status: AttendanceStatus;
}
```

- [ ] **Step 6: Verificar que el backend arranca y compila**

Run: `cd apps/api && pnpm exec tsc --noEmit`
Expected: sin errores (el único error pendiente, en el frontend por el cambio de shape, se resuelve en el Task 4).

Run: `cd apps/api && pnpm test`
Expected: toda la suite pasa, incluyendo los tests nuevos del Task 2.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/attendance/interface apps/api/src/modules/schedule/schedule.module.ts apps/api/src/modules/attendance/attendance.module.ts packages/shared-types/src/index.ts
git commit -m "feat(attendance): DTOs y wiring para asistencia por horario"
```

### Task 4: Frontend — `TakeAttendanceForm` elige horario en vez de sección

**Files:**
- Modify: `apps/web/src/features/attendance/use-attendance.ts`
- Modify: `apps/web/src/features/attendance/components/take-attendance-form.tsx`

**Interfaces:**
- Consumes: `useSchedules(filter?: ScheduleFilter)` (ya existe, `apps/web/src/features/schedule/use-schedules.ts`) con `ScheduleFilter { sectionId?, teacherId?, academicYearId?, dayOfWeek? }`. `AttendanceRecord` de shared-types (Task 3).

- [ ] **Step 1: Actualizar `use-attendance.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AttendanceRecord, AttendanceStatus } from '@eduapp/shared-types';

export interface AttendanceFilter {
  scheduleId: string;
  date: string;
}

async function fetchAttendance(filter: AttendanceFilter): Promise<AttendanceRecord[]> {
  const qs = new URLSearchParams(filter as unknown as Record<string, string>).toString();
  const res = await fetch(`/api/attendance?${qs}`);
  if (!res.ok) throw new Error('No se pudo cargar la asistencia');
  return res.json();
}

export interface RecordAttendanceInput {
  scheduleId: string;
  date: string;
  records: { enrollmentId: string; status: AttendanceStatus }[];
}

async function recordAttendance(input: RecordAttendanceInput): Promise<AttendanceRecord[]> {
  const res = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo guardar la asistencia');
  return res.json();
}

export function useAttendance(filter: AttendanceFilter, enabled: boolean) {
  return useQuery({
    queryKey: ['attendance', filter],
    queryFn: () => fetchAttendance(filter),
    enabled,
  });
}

export function useRecordAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordAttendance,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });
}
```

- [ ] **Step 2: Reescribir `TakeAttendanceForm`**

Reemplaza el selector "Sección" por "Horario" (filtrado por año lectivo y, si `currentUserId` corresponde a un docente, por `teacherId`). El componente recibe el id del usuario actual como prop para poder filtrar — se lo pasa la page (`/attendance`), que ya llama a `getCurrentUser()` server-side.

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAttendance, useRecordAttendance } from '../use-attendance';
import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSchedules } from '@/features/schedule/use-schedules';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { todayLocalDate } from '@/lib/date';
import type { AttendanceStatus } from '@eduapp/shared-types';

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: 'presente', label: 'Presente' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'justificado', label: 'Justificado' },
];

export function TakeAttendanceForm({
  readOnly = false,
  currentUserId,
  isDocente,
}: {
  readOnly?: boolean;
  currentUserId: string;
  isDocente: boolean;
}) {
  const { data: years } = useAcademicYears();
  const { data: students } = useUsers('estudiante');

  const [academicYearId, setAcademicYearId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [date, setDate] = useState(todayLocalDate());
  const [statusByEnrollment, setStatusByEnrollment] = useState<Record<string, AttendanceStatus>>(
    {},
  );

  const { data: schedules } = useSchedules(
    academicYearId
      ? { academicYearId, ...(isDocente ? { teacherId: currentUserId } : {}) }
      : undefined,
  );

  const selectedSchedule = schedules?.find((s) => s.id === scheduleId);
  const ready = Boolean(academicYearId && scheduleId && date && selectedSchedule);

  const { data: enrollments } = useEnrollments(
    ready ? { sectionId: selectedSchedule!.sectionId, academicYearId } : undefined,
  );
  const { data: existingRecords } = useAttendance({ scheduleId, date }, ready);
  const recordAttendance = useRecordAttendance();

  const studentNameById = useMemo(
    () => new Map(students?.map((s) => [s.id, s.fullName])),
    [students],
  );

  const activeEnrollments = useMemo(
    () => (enrollments ?? []).filter((e) => e.status === 'active'),
    [enrollments],
  );

  // Precarga los estados: el existente si ya se tomó asistencia ese día, si no 'presente'.
  useEffect(() => {
    if (!ready || !enrollments) return;
    const existingByEnrollment = new Map(existingRecords?.map((r) => [r.enrollmentId, r.status]));
    const next: Record<string, AttendanceStatus> = {};
    for (const enrollment of activeEnrollments) {
      next[enrollment.id] = existingByEnrollment.get(enrollment.id) ?? 'presente';
    }
    setStatusByEnrollment(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, enrollments, existingRecords]);

  function handleSubmit() {
    recordAttendance.mutate({
      scheduleId,
      date,
      records: activeEnrollments.map((e) => ({
        enrollmentId: e.id,
        status: statusByEnrollment[e.id] ?? 'presente',
      })),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="academicYearId">Año lectivo</Label>
          <select
            id="academicYearId"
            value={academicYearId}
            onChange={(e) => {
              setAcademicYearId(e.target.value);
              setScheduleId('');
            }}
            className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Selecciona un año
            </option>
            {years?.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scheduleId">Horario</Label>
          <select
            id="scheduleId"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            disabled={!academicYearId}
            className="flex h-10 w-56 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
          >
            <option value="" disabled>
              Selecciona una clase
            </option>
            {schedules?.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.dayOfWeek} {schedule.startTime}–{schedule.endTime}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {ready && activeEnrollments.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No hay estudiantes matriculados en esa sección para ese año lectivo.
        </p>
      )}

      {ready && activeEnrollments.length > 0 && (
        <div className="space-y-3">
          <ul className="space-y-2">
            {activeEnrollments.map((enrollment) => (
              <Card key={enrollment.id} className="flex items-center justify-between py-3">
                <p className="font-medium">
                  {studentNameById.get(enrollment.studentId) ?? enrollment.studentId}
                </p>
                <select
                  value={statusByEnrollment[enrollment.id] ?? 'presente'}
                  disabled={readOnly}
                  onChange={(e) =>
                    setStatusByEnrollment((prev) => ({
                      ...prev,
                      [enrollment.id]: e.target.value as AttendanceStatus,
                    }))
                  }
                  className="flex h-9 w-36 rounded border border-border bg-background px-2 text-sm outline-none focus:border-primary disabled:opacity-60"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Card>
            ))}
          </ul>

          {!readOnly && (
            <>
              <Button onClick={handleSubmit} disabled={recordAttendance.isPending}>
                {recordAttendance.isPending ? 'Guardando...' : 'Guardar asistencia'}
              </Button>
              {recordAttendance.isSuccess && (
                <p className="text-sm text-muted-foreground">Asistencia guardada.</p>
              )}
              {recordAttendance.isError && (
                <p className="text-sm text-destructive">No se pudo guardar la asistencia.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Actualizar la page que renderiza el formulario**

Buscar el archivo que renderiza `<TakeAttendanceForm .../>` (`apps/web/src/app/(dashboard)/attendance/page.tsx`) y pasarle las nuevas props:

```tsx
<TakeAttendanceForm
  readOnly={!canRecord}
  currentUserId={user!.id}
  isDocente={(user?.roles ?? []).includes('docente')}
/>
```

(mantiene el resto de la page sin cambios — `canRecord` ya se calcula ahí con `canRecordAttendance`).

- [ ] **Step 4: Verificar tipos**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/attendance apps/web/src/app/\(dashboard\)/attendance/page.tsx
git commit -m "feat(attendance): TakeAttendanceForm elige horario en vez de sección"
```

### Task 5: Verificación manual de Fase 1 en navegador

**Files:** ninguno (checkpoint de QA).

- [ ] **Step 1: Levantar los servidores de desarrollo**

Run: `(cd apps/api && PORT=3031 nohup pnpm dev > /tmp/grading-api.log 2>&1 &)`
Run: `(PORT=3022 NEXT_PUBLIC_API_URL=http://localhost:3031 nohup pnpm --filter web dev > /tmp/grading-web.log 2>&1 &)`

- [ ] **Step 2: Verificar en el navegador**

Iniciar sesión como `docente`, ir a `/attendance`. Confirmar: el selector ahora dice "Horario" (no "Sección"), listando solo las clases del docente logueado; elegir una, cargar asistencia con al menos un "Ausente", guardar, recargar la página y confirmar que el estado persiste. Repetir el `POST` sobre un horario con una `ClassCancellation` registrada (si no hay ninguna a mano, cancelar una clase virtual desde `/schedule` primero) y confirmar que el backend devuelve 400.

- [ ] **Step 3: Bajar los servidores**

Run: `ps aux | grep -E "apps/api|apps/web" | grep -v grep | awk '{print $2}' | xargs -r kill -9`

---

## Fase 2 — Notas ponderadas + boletín

### Task 6: `Período` — nueva entidad en el módulo `academic`

**Files:**
- Create: `apps/api/src/core/database/migrations/tenant/1700000000054-CreatePeriods.ts`
- Create: `apps/api/src/modules/academic/domain/entities/period.entity.ts`
- Create: `apps/api/src/modules/academic/application/ports/period.repository.port.ts`
- Create: `apps/api/src/modules/academic/infrastructure/entities/period.orm-entity.ts`
- Create: `apps/api/src/modules/academic/infrastructure/repositories/typeorm-period.repository.ts`
- Create: `apps/api/src/modules/academic/application/use-cases/create-period.use-case.ts`
- Create: `apps/api/src/modules/academic/application/use-cases/create-period.use-case.spec.ts`
- Create: `apps/api/src/modules/academic/application/use-cases/list-periods.use-case.ts`
- Create: `apps/api/src/modules/academic/application/use-cases/edit-period.use-case.ts`
- Create: `apps/api/src/modules/academic/application/use-cases/edit-period.use-case.spec.ts`
- Create: `apps/api/src/modules/academic/interface/dtos/create-period.dto.ts`
- Create: `apps/api/src/modules/academic/interface/dtos/edit-period.dto.ts`
- Create: `apps/api/src/modules/academic/interface/dtos/list-periods-query.dto.ts`
- Create: `apps/api/src/modules/academic/interface/controllers/periods.controller.ts`
- Modify: `apps/api/src/modules/academic/academic.module.ts`
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Produces: `Period` entidad `(id, academicYearId, name, order, weight, startDate, endDate)`. `PeriodRepositoryPort.findAll(filter?: { academicYearId?: string }): Promise<Period[]>`, `findById(id): Promise<Period | null>`, `save(period): Promise<void>`. Consumido por Task 8 (`Evaluation.periodId`) y Task 9 (`GradeCalculationService`).

- [ ] **Step 1: Escribir la migración**

```ts
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
```

Run: `cd apps/api && pnpm migration:run:tenant:all`
Expected: aplica sin error.

- [ ] **Step 2: Entidad de dominio**

```ts
export class Period {
  constructor(
    public readonly id: string,
    public readonly academicYearId: string,
    public name: string,
    public order: number,
    public weight: number,
    public startDate: string,
    public endDate: string,
  ) {
    if (startDate >= endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    if (weight <= 0 || weight > 1) {
      throw new Error('El peso del periodo debe estar entre 0 y 1');
    }
  }

  edit(name: string, order: number, weight: number, startDate: string, endDate: string): void {
    if (startDate >= endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    if (weight <= 0 || weight > 1) {
      throw new Error('El peso del periodo debe estar entre 0 y 1');
    }
    this.name = name;
    this.order = order;
    this.weight = weight;
    this.startDate = startDate;
    this.endDate = endDate;
  }
}
```

- [ ] **Step 3: Puerto**

```ts
import { Period } from '../../domain/entities/period.entity';

export interface PeriodFilter {
  academicYearId?: string;
}

export abstract class PeriodRepositoryPort {
  abstract findAll(filter?: PeriodFilter): Promise<Period[]>;
  abstract findById(id: string): Promise<Period | null>;
  abstract save(period: Period): Promise<void>;
}
```

- [ ] **Step 4: Orm-entity**

```ts
import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'periods' })
export class PeriodOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'academic_year_id' })
  academicYearId: string;

  @Column()
  name: string;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'real' })
  weight: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
```

- [ ] **Step 5: Repositorio**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PeriodFilter, PeriodRepositoryPort } from '../../application/ports/period.repository.port';
import { Period } from '../../domain/entities/period.entity';
import { PeriodOrmEntity } from '../entities/period.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmPeriodRepository extends PeriodRepositoryPort {
  private readonly repo: Repository<PeriodOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(PeriodOrmEntity);
  }

  async findAll(filter?: PeriodFilter): Promise<Period[]> {
    const rows = await this.repo.find({
      where: { ...(filter?.academicYearId && { academicYearId: filter.academicYearId }) },
      order: { order: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Period | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(period: Period): Promise<void> {
    await this.repo.save({
      id: period.id,
      academicYearId: period.academicYearId,
      name: period.name,
      order: period.order,
      weight: period.weight,
      startDate: period.startDate,
      endDate: period.endDate,
    });
  }

  private toDomain(row: PeriodOrmEntity): Period {
    return new Period(row.id, row.academicYearId, row.name, row.order, row.weight, row.startDate, row.endDate);
  }
}
```

- [ ] **Step 6: Test que falla para `CreatePeriodUseCase`**

```ts
import { BadRequestException } from '@nestjs/common';
import { CreatePeriodUseCase } from './create-period.use-case';
import { PeriodRepositoryPort } from '../ports/period.repository.port';
import { Period } from '../../domain/entities/period.entity';

describe('CreatePeriodUseCase', () => {
  const periods: jest.Mocked<PeriodRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new CreatePeriodUseCase(periods);

  beforeEach(() => jest.clearAllMocks());

  it('crea el periodo cuando los datos son válidos', async () => {
    periods.findAll.mockResolvedValue([]);

    const result = await useCase.execute({
      academicYearId: 'year-1',
      name: 'Primer periodo',
      order: 1,
      weight: 0.25,
      startDate: '2026-01-20',
      endDate: '2026-03-20',
    });

    expect(result.name).toBe('Primer periodo');
    expect(periods.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza si la suma de pesos del año lectivo superaría 100%', async () => {
    periods.findAll.mockResolvedValue([
      new Period('p1', 'year-1', 'P1', 1, 0.5, '2026-01-01', '2026-02-01'),
      new Period('p2', 'year-1', 'P2', 2, 0.4, '2026-02-01', '2026-03-01'),
    ]);

    await expect(
      useCase.execute({
        academicYearId: 'year-1',
        name: 'P3',
        order: 3,
        weight: 0.2,
        startDate: '2026-03-01',
        endDate: '2026-04-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza fechas o pesos inválidos traduciendo el error del dominio', async () => {
    periods.findAll.mockResolvedValue([]);

    await expect(
      useCase.execute({
        academicYearId: 'year-1',
        name: 'P1',
        order: 1,
        weight: 0.25,
        startDate: '2026-03-20',
        endDate: '2026-01-20',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
```

Run: `cd apps/api && pnpm test create-period.use-case`
Expected: FAIL (el archivo `create-period.use-case.ts` todavía no existe).

- [ ] **Step 7: Implementar `CreatePeriodUseCase`**

```ts
import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PeriodRepositoryPort } from '../ports/period.repository.port';
import { Period } from '../../domain/entities/period.entity';

export interface CreatePeriodInput {
  academicYearId: string;
  name: string;
  order: number;
  weight: number;
  startDate: string;
  endDate: string;
}

const WEIGHT_TOLERANCE = 0.001;

@Injectable()
export class CreatePeriodUseCase {
  constructor(@Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort) {}

  async execute(input: CreatePeriodInput): Promise<Period> {
    const existing = await this.periods.findAll({ academicYearId: input.academicYearId });
    const totalWeight = existing.reduce((sum, p) => sum + p.weight, 0) + input.weight;
    if (totalWeight > 1 + WEIGHT_TOLERANCE) {
      throw new BadRequestException(
        `La suma de pesos de los periodos de ese año lectivo superaría el 100% (quedaría en ${Math.round(totalWeight * 100)}%)`,
      );
    }

    let period: Period;
    try {
      period = new Period(
        randomUUID(),
        input.academicYearId,
        input.name,
        input.order,
        input.weight,
        input.startDate,
        input.endDate,
      );
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    await this.periods.save(period);
    return period;
  }
}
```

Run: `cd apps/api && pnpm test create-period.use-case`
Expected: PASS.

- [ ] **Step 8: `ListPeriodsUseCase` (sin test — pass-through simple, mismo criterio que `ListEvaluationsUseCase`)**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { PeriodFilter, PeriodRepositoryPort } from '../ports/period.repository.port';
import { Period } from '../../domain/entities/period.entity';

@Injectable()
export class ListPeriodsUseCase {
  constructor(@Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort) {}

  async execute(filter?: PeriodFilter): Promise<Period[]> {
    return this.periods.findAll(filter);
  }
}
```

- [ ] **Step 9: Test que falla para `EditPeriodUseCase`**

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EditPeriodUseCase } from './edit-period.use-case';
import { PeriodRepositoryPort } from '../ports/period.repository.port';
import { Period } from '../../domain/entities/period.entity';

describe('EditPeriodUseCase', () => {
  const periods: jest.Mocked<PeriodRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new EditPeriodUseCase(periods);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si el id no existe', async () => {
    periods.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('p1', { name: 'P1', order: 1, weight: 0.25, startDate: '2026-01-01', endDate: '2026-02-01' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza si la nueva suma de pesos del año lectivo superaría 100%, excluyendo el propio periodo', async () => {
    const target = new Period('p1', 'year-1', 'P1', 1, 0.25, '2026-01-01', '2026-02-01');
    periods.findById.mockResolvedValue(target);
    periods.findAll.mockResolvedValue([
      target,
      new Period('p2', 'year-1', 'P2', 2, 0.5, '2026-02-01', '2026-03-01'),
    ]);

    await expect(
      useCase.execute('p1', { name: 'P1', order: 1, weight: 0.6, startDate: '2026-01-01', endDate: '2026-02-01' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('edita correctamente dentro del límite de 100%', async () => {
    const target = new Period('p1', 'year-1', 'P1', 1, 0.25, '2026-01-01', '2026-02-01');
    periods.findById.mockResolvedValue(target);
    periods.findAll.mockResolvedValue([
      target,
      new Period('p2', 'year-1', 'P2', 2, 0.5, '2026-02-01', '2026-03-01'),
    ]);

    const result = await useCase.execute('p1', {
      name: 'Primer periodo',
      order: 1,
      weight: 0.4,
      startDate: '2026-01-01',
      endDate: '2026-02-15',
    });

    expect(result.name).toBe('Primer periodo');
    expect(result.weight).toBe(0.4);
    expect(periods.save).toHaveBeenCalledTimes(1);
  });
});
```

Run: `cd apps/api && pnpm test edit-period.use-case`
Expected: FAIL.

- [ ] **Step 10: Implementar `EditPeriodUseCase`**

```ts
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PeriodRepositoryPort } from '../ports/period.repository.port';
import { Period } from '../../domain/entities/period.entity';

export interface EditPeriodInput {
  name: string;
  order: number;
  weight: number;
  startDate: string;
  endDate: string;
}

const WEIGHT_TOLERANCE = 0.001;

@Injectable()
export class EditPeriodUseCase {
  constructor(@Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort) {}

  async execute(id: string, input: EditPeriodInput): Promise<Period> {
    const period = await this.periods.findById(id);
    if (!period) {
      throw new NotFoundException(`No existe el periodo "${id}"`);
    }

    const siblings = await this.periods.findAll({ academicYearId: period.academicYearId });
    const totalWeight =
      siblings.filter((p) => p.id !== id).reduce((sum, p) => sum + p.weight, 0) + input.weight;
    if (totalWeight > 1 + WEIGHT_TOLERANCE) {
      throw new BadRequestException(
        `La suma de pesos de los periodos de ese año lectivo superaría el 100% (quedaría en ${Math.round(totalWeight * 100)}%)`,
      );
    }

    try {
      period.edit(input.name, input.order, input.weight, input.startDate, input.endDate);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    await this.periods.save(period);
    return period;
  }
}
```

Run: `cd apps/api && pnpm test edit-period.use-case`
Expected: PASS.

- [ ] **Step 11: DTOs**

```ts
// create-period.dto.ts
import { IsDateString, IsInt, IsNumber, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CreatePeriodDto {
  @IsUUID()
  academicYearId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsNumber()
  @Min(0.01)
  @Max(1)
  weight: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
```

```ts
// edit-period.dto.ts
import { IsDateString, IsInt, IsNumber, IsString, Max, Min, MinLength } from 'class-validator';

export class EditPeriodDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsNumber()
  @Min(0.01)
  @Max(1)
  weight: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
```

```ts
// list-periods-query.dto.ts
import { IsOptional, IsUUID } from 'class-validator';

export class ListPeriodsQueryDto {
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}
```

- [ ] **Step 12: Controller**

```ts
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreatePeriodUseCase } from '../../application/use-cases/create-period.use-case';
import { ListPeriodsUseCase } from '../../application/use-cases/list-periods.use-case';
import { EditPeriodUseCase } from '../../application/use-cases/edit-period.use-case';
import { CreatePeriodDto } from '../dtos/create-period.dto';
import { EditPeriodDto } from '../dtos/edit-period.dto';
import { ListPeriodsQueryDto } from '../dtos/list-periods-query.dto';

@Controller('academic/periods')
export class PeriodsController {
  constructor(
    private readonly createPeriod: CreatePeriodUseCase,
    private readonly listPeriods: ListPeriodsUseCase,
    private readonly editPeriod: EditPeriodUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('manage', 'AcademicYear'))
  async create(@Body() dto: CreatePeriodDto) {
    return this.createPeriod.execute(dto);
  }

  @Get()
  async list(@Query() query: ListPeriodsQueryDto) {
    return this.listPeriods.execute(query);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('manage', 'AcademicYear'))
  async edit(@Param('id') id: string, @Body() dto: EditPeriodDto) {
    return this.editPeriod.execute(id, dto);
  }
}
```

- [ ] **Step 13: Wiring en `AcademicModule`**

Agregar `PeriodsController` a `controllers`; `CreatePeriodUseCase`, `ListPeriodsUseCase`, `EditPeriodUseCase` y el provider de `PeriodRepositoryPort` a `providers`; `PeriodRepositoryPort` a `exports` (los consume `GradingModule` en Tasks 9-14):

```ts
// academic.module.ts — agregar imports:
import { PeriodsController } from './interface/controllers/periods.controller';
import { CreatePeriodUseCase } from './application/use-cases/create-period.use-case';
import { ListPeriodsUseCase } from './application/use-cases/list-periods.use-case';
import { EditPeriodUseCase } from './application/use-cases/edit-period.use-case';
import { PeriodRepositoryPort } from './application/ports/period.repository.port';
import { TypeOrmPeriodRepository } from './infrastructure/repositories/typeorm-period.repository';

// dentro de @Module:
//   controllers: [..., PeriodsController],
//   providers: [
//     ...,
//     CreatePeriodUseCase,
//     ListPeriodsUseCase,
//     EditPeriodUseCase,
//     { provide: PeriodRepositoryPort, useClass: TypeOrmPeriodRepository },
//   ],
//   exports: [..., PeriodRepositoryPort],
```

- [ ] **Step 14: Shared-types**

Agregar en `packages/shared-types/src/index.ts` (junto a los demás tipos académicos):

```ts
export interface Period {
  id: string;
  academicYearId: string;
  name: string;
  order: number;
  weight: number;
  startDate: string;
  endDate: string;
}
```

- [ ] **Step 15: Correr toda la suite y verificar tipos**

Run: `cd apps/api && pnpm test && pnpm exec tsc --noEmit`
Expected: todo verde.

- [ ] **Step 16: Commit**

```bash
git add apps/api/src/core/database/migrations/tenant/1700000000054-CreatePeriods.ts apps/api/src/modules/academic packages/shared-types/src/index.ts
git commit -m "feat(academic): agrega Período configurable por año lectivo"
```

### Task 7: `GradeWeightConfig` — pesos de categoría, una fila por colegio

**Files:**
- Create: `apps/api/src/core/database/migrations/tenant/1700000000055-CreateGradeWeightConfigs.ts`
- Create: `apps/api/src/modules/grading/domain/entities/grade-weight-config.entity.ts`
- Create: `apps/api/src/modules/grading/application/ports/grade-weight-config.repository.port.ts`
- Create: `apps/api/src/modules/grading/infrastructure/entities/grade-weight-config.orm-entity.ts`
- Create: `apps/api/src/modules/grading/infrastructure/repositories/typeorm-grade-weight-config.repository.ts`
- Create: `apps/api/src/modules/grading/application/services/grade-weight-config.service.ts`
- Create: `apps/api/src/modules/grading/application/services/grade-weight-config.service.spec.ts`
- Create: `apps/api/src/modules/grading/application/use-cases/get-grade-weight-config.use-case.ts`
- Create: `apps/api/src/modules/grading/application/use-cases/edit-grade-weight-config.use-case.ts`
- Create: `apps/api/src/modules/grading/application/use-cases/edit-grade-weight-config.use-case.spec.ts`
- Create: `apps/api/src/modules/grading/interface/dtos/edit-grade-weight-config.dto.ts`
- Create: `apps/api/src/modules/grading/interface/controllers/grade-weight-config.controller.ts`
- Modify: `apps/api/src/modules/grading/grading.module.ts`
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Produces: `GradeCategory = 'actividad' | 'evaluacion_bimestral' | 'disciplina'` (se define acá, es consumido por Task 8 en adelante). `GradeWeightConfig` entidad `(id, actividadWeight, evaluacionBimestralWeight, disciplinaWeight)`. `GradeWeightConfigService.getOrCreateDefault(): Promise<GradeWeightConfig>` — consumido por Task 9 (`GetGradebookUseCase`) para no duplicar la lógica de "crear con default si no existe".

- [ ] **Step 1: Migración**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Una sola fila por colegio (tenant) — no hay endpoint de "crear", solo
 * get-or-create-default (ver `GradeWeightConfigService`) + edit. Los 3
 * pesos deben sumar 1 (con tolerancia de punto flotante), validado en la
 * capa de aplicación, no acá.
 */
export class CreateGradeWeightConfigs1700000000055 implements MigrationInterface {
  name = 'CreateGradeWeightConfigs1700000000055';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "grade_weight_configs" (
        "id" uuid PRIMARY KEY,
        "actividad_weight" real NOT NULL DEFAULT 0.65,
        "evaluacion_bimestral_weight" real NOT NULL DEFAULT 0.25,
        "disciplina_weight" real NOT NULL DEFAULT 0.10,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "grade_weight_configs"`);
  }
}
```

Run: `cd apps/api && pnpm migration:run:tenant:all`

- [ ] **Step 2: Entidad de dominio**

```ts
export type GradeCategory = 'actividad' | 'evaluacion_bimestral' | 'disciplina';

const WEIGHT_TOLERANCE = 0.001;

export class GradeWeightConfig {
  constructor(
    public readonly id: string,
    public actividadWeight: number,
    public evaluacionBimestralWeight: number,
    public disciplinaWeight: number,
  ) {
    GradeWeightConfig.assertSumsToOne(actividadWeight, evaluacionBimestralWeight, disciplinaWeight);
  }

  edit(actividadWeight: number, evaluacionBimestralWeight: number, disciplinaWeight: number): void {
    GradeWeightConfig.assertSumsToOne(actividadWeight, evaluacionBimestralWeight, disciplinaWeight);
    this.actividadWeight = actividadWeight;
    this.evaluacionBimestralWeight = evaluacionBimestralWeight;
    this.disciplinaWeight = disciplinaWeight;
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
}
```

- [ ] **Step 3: Puerto**

```ts
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

export abstract class GradeWeightConfigRepositoryPort {
  abstract findFirst(): Promise<GradeWeightConfig | null>;
  abstract save(config: GradeWeightConfig): Promise<void>;
}
```

- [ ] **Step 4: Orm-entity**

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

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
```

- [ ] **Step 5: Repositorio**

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
    });
  }

  private toDomain(row: GradeWeightConfigOrmEntity): GradeWeightConfig {
    return new GradeWeightConfig(
      row.id,
      row.actividadWeight,
      row.evaluacionBimestralWeight,
      row.disciplinaWeight,
    );
  }
}
```

- [ ] **Step 6: Test que falla para `GradeWeightConfigService`**

```ts
import { GradeWeightConfigService } from './grade-weight-config.service';
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

describe('GradeWeightConfigService', () => {
  const configs: jest.Mocked<GradeWeightConfigRepositoryPort> = {
    findFirst: jest.fn(),
    save: jest.fn(),
  };

  const service = new GradeWeightConfigService(configs);

  beforeEach(() => jest.clearAllMocks());

  it('devuelve la config existente si ya hay una', async () => {
    const existing = new GradeWeightConfig('cfg-1', 0.7, 0.2, 0.1);
    configs.findFirst.mockResolvedValue(existing);

    const result = await service.getOrCreateDefault();

    expect(result).toBe(existing);
    expect(configs.save).not.toHaveBeenCalled();
  });

  it('crea una con los pesos default 65/25/10 si no hay ninguna', async () => {
    configs.findFirst.mockResolvedValue(null);

    const result = await service.getOrCreateDefault();

    expect(result.actividadWeight).toBe(0.65);
    expect(result.evaluacionBimestralWeight).toBe(0.25);
    expect(result.disciplinaWeight).toBe(0.1);
    expect(configs.save).toHaveBeenCalledTimes(1);
  });
});
```

Run: `cd apps/api && pnpm test grade-weight-config.service`
Expected: FAIL.

- [ ] **Step 7: Implementar `GradeWeightConfigService`**

```ts
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

const DEFAULT_ACTIVIDAD_WEIGHT = 0.65;
const DEFAULT_EVALUACION_BIMESTRAL_WEIGHT = 0.25;
const DEFAULT_DISCIPLINA_WEIGHT = 0.1;

@Injectable()
export class GradeWeightConfigService {
  constructor(
    @Inject(GradeWeightConfigRepositoryPort) private readonly configs: GradeWeightConfigRepositoryPort,
  ) {}

  async getOrCreateDefault(): Promise<GradeWeightConfig> {
    const existing = await this.configs.findFirst();
    if (existing) return existing;

    const config = new GradeWeightConfig(
      randomUUID(),
      DEFAULT_ACTIVIDAD_WEIGHT,
      DEFAULT_EVALUACION_BIMESTRAL_WEIGHT,
      DEFAULT_DISCIPLINA_WEIGHT,
    );
    await this.configs.save(config);
    return config;
  }

  async save(config: GradeWeightConfig): Promise<void> {
    await this.configs.save(config);
  }
}
```

Run: `cd apps/api && pnpm test grade-weight-config.service`
Expected: PASS.

- [ ] **Step 8: `GetGradeWeightConfigUseCase`**

```ts
import { Injectable } from '@nestjs/common';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

@Injectable()
export class GetGradeWeightConfigUseCase {
  constructor(private readonly configService: GradeWeightConfigService) {}

  async execute(): Promise<GradeWeightConfig> {
    return this.configService.getOrCreateDefault();
  }
}
```

- [ ] **Step 9: Test que falla para `EditGradeWeightConfigUseCase`**

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
      useCase.execute({ actividadWeight: 0.5, evaluacionBimestralWeight: 0.3, disciplinaWeight: 0.3 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('actualiza los pesos cuando suman 100%', async () => {
    configs.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1));

    const result = await useCase.execute({
      actividadWeight: 0.6,
      evaluacionBimestralWeight: 0.3,
      disciplinaWeight: 0.1,
    });

    expect(result.actividadWeight).toBe(0.6);
    expect(configs.save).toHaveBeenCalledTimes(1);
  });
});
```

Run: `cd apps/api && pnpm test edit-grade-weight-config.use-case`
Expected: FAIL.

- [ ] **Step 10: Implementar `EditGradeWeightConfigUseCase`**

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

export interface EditGradeWeightConfigInput {
  actividadWeight: number;
  evaluacionBimestralWeight: number;
  disciplinaWeight: number;
}

@Injectable()
export class EditGradeWeightConfigUseCase {
  constructor(private readonly configService: GradeWeightConfigService) {}

  async execute(input: EditGradeWeightConfigInput): Promise<GradeWeightConfig> {
    const config = await this.configService.getOrCreateDefault();
    try {
      config.edit(input.actividadWeight, input.evaluacionBimestralWeight, input.disciplinaWeight);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    await this.configService.save(config);
    return config;
  }
}
```

Run: `cd apps/api && pnpm test edit-grade-weight-config.use-case`
Expected: PASS.

- [ ] **Step 11: DTO**

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
}
```

- [ ] **Step 12: Controller**

```ts
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { GetGradeWeightConfigUseCase } from '../../application/use-cases/get-grade-weight-config.use-case';
import { EditGradeWeightConfigUseCase } from '../../application/use-cases/edit-grade-weight-config.use-case';
import { EditGradeWeightConfigDto } from '../dtos/edit-grade-weight-config.dto';

@Controller('grading/weight-config')
export class GradeWeightConfigController {
  constructor(
    private readonly getConfig: GetGradeWeightConfigUseCase,
    private readonly editConfig: EditGradeWeightConfigUseCase,
  ) {}

  @Get()
  async get() {
    return this.getConfig.execute();
  }

  @Patch()
  @CheckPolicies((ability) => ability.can('manage', 'AcademicYear'))
  async edit(@Body() dto: EditGradeWeightConfigDto) {
    return this.editConfig.execute(dto);
  }
}
```

- [ ] **Step 13: Wiring en `GradingModule`**

```ts
// grading.module.ts — agregar a los imports existentes:
import { GradeWeightConfigController } from './interface/controllers/grade-weight-config.controller';
import { GetGradeWeightConfigUseCase } from './application/use-cases/get-grade-weight-config.use-case';
import { EditGradeWeightConfigUseCase } from './application/use-cases/edit-grade-weight-config.use-case';
import { GradeWeightConfigService } from './application/services/grade-weight-config.service';
import { GradeWeightConfigRepositoryPort } from './application/ports/grade-weight-config.repository.port';
import { TypeOrmGradeWeightConfigRepository } from './infrastructure/repositories/typeorm-grade-weight-config.repository';

// dentro de @Module:
//   controllers: [EvaluationsController, ScoresController, GradeWeightConfigController],
//   providers: [
//     ..., // los ya existentes
//     GetGradeWeightConfigUseCase,
//     EditGradeWeightConfigUseCase,
//     GradeWeightConfigService,
//     { provide: GradeWeightConfigRepositoryPort, useClass: TypeOrmGradeWeightConfigRepository },
//   ],
```

- [ ] **Step 14: Shared-types**

```ts
export type GradeCategory = 'actividad' | 'evaluacion_bimestral' | 'disciplina';

export interface GradeWeightConfig {
  id: string;
  actividadWeight: number;
  evaluacionBimestralWeight: number;
  disciplinaWeight: number;
}
```

- [ ] **Step 15: Correr toda la suite y verificar tipos**

Run: `cd apps/api && pnpm test && pnpm exec tsc --noEmit`
Expected: todo verde.

- [ ] **Step 16: Commit**

```bash
git add apps/api/src/core/database/migrations/tenant/1700000000055-CreateGradeWeightConfigs.ts apps/api/src/modules/grading packages/shared-types/src/index.ts
git commit -m "feat(grading): agrega GradeWeightConfig (pesos de categoría por colegio)"
```

### Task 8: `Evaluation` — `type`/`period` (texto) pasan a `category`/`periodId`/`label`

**Files:**
- Create: `apps/api/src/core/database/migrations/tenant/1700000000056-ReplaceEvaluationTypeWithCategory.ts`
- Modify: `apps/api/src/modules/grading/domain/entities/evaluation.entity.ts`
- Modify: `apps/api/src/modules/grading/application/ports/evaluation.repository.port.ts`
- Modify: `apps/api/src/modules/grading/infrastructure/entities/evaluation.orm-entity.ts`
- Modify: `apps/api/src/modules/grading/infrastructure/repositories/typeorm-evaluation.repository.ts`
- Modify: `apps/api/src/modules/grading/application/use-cases/create-evaluation.use-case.ts`
- Modify: `apps/api/src/modules/grading/interface/dtos/create-evaluation.dto.ts`
- Modify: `apps/api/src/modules/grading/interface/dtos/list-evaluations-query.dto.ts`
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Consumes: `GradeCategory` de Task 7. `Period` de Task 6.
- Produces: `Evaluation` constructor `(id, subjectId, sectionId, academicYearId, periodId, category, maxScore, label)`. `EvaluationFilter` gana `periodId?`/`category?`. Consumido por Task 9 (`GradeCalculationService`) y por Task 16 (frontend).

- [ ] **Step 1: Migración**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `type` (examen/tarea/proyecto/otro, sin relación a pesos) se reemplaza
 * por `category` (actividad/evaluacion_bimestral/disciplina, la categoría
 * ponderada real); `period` (texto libre) pasa a `period_id` (FK a la
 * nueva tabla `periods`). No hay forma automática de mapear datos viejos a
 * este esquema nuevo (una evaluación vieja no tiene categoría ni periodo
 * formal), así que se limpian las evaluaciones y notas existentes — este
 * proyecto todavía no tiene datos de producción reales, solo de desarrollo.
 */
export class ReplaceEvaluationTypeWithCategory1700000000056 implements MigrationInterface {
  name = 'ReplaceEvaluationTypeWithCategory1700000000056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cascada a `grade_scores` vía su FK ON DELETE CASCADE (ver
    // 1700000000008-CreateGradeScores).
    await queryRunner.query(`DELETE FROM "evaluations"`);

    await queryRunner.query(`ALTER TABLE "evaluations" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "evaluations" DROP COLUMN "period"`);

    await queryRunner.query(`ALTER TABLE "evaluations" ADD COLUMN "category" varchar NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "evaluations" ADD COLUMN "period_id" uuid NOT NULL REFERENCES "periods"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`ALTER TABLE "evaluations" ADD COLUMN "label" varchar`);

    await queryRunner.query(`
      CREATE INDEX "IDX_evaluations_period_category" ON "evaluations" ("period_id", "category")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "evaluations"`);
    await queryRunner.query(`DROP INDEX "IDX_evaluations_period_category"`);
    await queryRunner.query(`ALTER TABLE "evaluations" DROP COLUMN "label"`);
    await queryRunner.query(`ALTER TABLE "evaluations" DROP COLUMN "period_id"`);
    await queryRunner.query(`ALTER TABLE "evaluations" DROP COLUMN "category"`);
    await queryRunner.query(`ALTER TABLE "evaluations" ADD COLUMN "type" varchar NOT NULL DEFAULT 'otro'`);
    await queryRunner.query(`ALTER TABLE "evaluations" ADD COLUMN "period" varchar NOT NULL DEFAULT ''`);
  }
}
```

Run: `cd apps/api && pnpm migration:run:tenant:all`
Expected: aplica sin error (requiere que la migración `1700000000054-CreatePeriods` del Task 6 ya haya corrido, por el FK a `periods`).

- [ ] **Step 2: Entidad de dominio**

```ts
import { GradeCategory } from './grade-weight-config.entity';

export class Evaluation {
  constructor(
    public readonly id: string,
    public readonly subjectId: string,
    public readonly sectionId: string,
    public readonly academicYearId: string,
    public readonly periodId: string,
    public readonly category: GradeCategory,
    public readonly maxScore: number,
    public readonly label: string | null,
  ) {}
}
```

- [ ] **Step 3: Puerto**

```ts
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';

export interface EvaluationFilter {
  sectionId?: string;
  academicYearId?: string;
  subjectId?: string;
  periodId?: string;
  category?: GradeCategory;
}

export abstract class EvaluationRepositoryPort {
  abstract findAll(filter?: EvaluationFilter): Promise<Evaluation[]>;
  abstract findById(id: string): Promise<Evaluation | null>;
  abstract save(evaluation: Evaluation): Promise<void>;
}
```

- [ ] **Step 4: Orm-entity**

```ts
import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';

@Entity({ name: 'evaluations' })
export class EvaluationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @Column({ name: 'section_id' })
  sectionId: string;

  @Column({ name: 'academic_year_id' })
  academicYearId: string;

  @Column({ name: 'period_id' })
  periodId: string;

  @Column()
  category: GradeCategory;

  @Column({ nullable: true })
  label: string | null;

  // 'real' (no 'numeric'): pg devuelve columnas numeric como string por
  // defecto para no perder precisión — acá no la necesitamos y sí un
  // number nativo de JS sin transformer extra.
  @Column({ name: 'max_score', type: 'real' })
  maxScore: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
```

- [ ] **Step 5: Repositorio**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  EvaluationFilter,
  EvaluationRepositoryPort,
} from '../../application/ports/evaluation.repository.port';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { EvaluationOrmEntity } from '../entities/evaluation.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmEvaluationRepository extends EvaluationRepositoryPort {
  private readonly repo: Repository<EvaluationOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(EvaluationOrmEntity);
  }

  async findAll(filter?: EvaluationFilter): Promise<Evaluation[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.sectionId && { sectionId: filter.sectionId }),
        ...(filter?.academicYearId && { academicYearId: filter.academicYearId }),
        ...(filter?.subjectId && { subjectId: filter.subjectId }),
        ...(filter?.periodId && { periodId: filter.periodId }),
        ...(filter?.category && { category: filter.category }),
      },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Evaluation | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(evaluation: Evaluation): Promise<void> {
    await this.repo.save({
      id: evaluation.id,
      subjectId: evaluation.subjectId,
      sectionId: evaluation.sectionId,
      academicYearId: evaluation.academicYearId,
      periodId: evaluation.periodId,
      category: evaluation.category,
      maxScore: evaluation.maxScore,
      label: evaluation.label,
    });
  }

  private toDomain(row: EvaluationOrmEntity): Evaluation {
    return new Evaluation(
      row.id,
      row.subjectId,
      row.sectionId,
      row.academicYearId,
      row.periodId,
      row.category,
      row.maxScore,
      row.label,
    );
  }
}
```

- [ ] **Step 6: Actualizar `CreateEvaluationUseCase`**

```ts
import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface CreateEvaluationInput {
  subjectId: string;
  sectionId: string;
  academicYearId: string;
  periodId: string;
  category: GradeCategory;
  maxScore?: number;
  label?: string;
}

@Injectable()
export class CreateEvaluationUseCase {
  constructor(
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(input: CreateEvaluationInput, currentUser: JwtPayload): Promise<Evaluation> {
    const canAccess = await this.enrollmentAccess.canTeacherAccessSection(currentUser, input.sectionId);
    if (!canAccess) {
      throw new ForbiddenException('No tenés un horario asignado en esa sección');
    }

    const evaluation = new Evaluation(
      randomUUID(),
      input.subjectId,
      input.sectionId,
      input.academicYearId,
      input.periodId,
      input.category,
      input.maxScore ?? 10,
      input.label ?? null,
    );

    await this.evaluations.save(evaluation);
    return evaluation;
  }
}
```

- [ ] **Step 7: Actualizar `CreateEvaluationDto` y `ListEvaluationsQueryDto`**

```ts
// create-evaluation.dto.ts
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';

const KNOWN_CATEGORIES: GradeCategory[] = ['actividad', 'evaluacion_bimestral', 'disciplina'];

export class CreateEvaluationDto {
  @IsUUID()
  subjectId: string;

  @IsUUID()
  sectionId: string;

  @IsUUID()
  academicYearId: string;

  @IsUUID()
  periodId: string;

  @IsIn(KNOWN_CATEGORIES)
  category: GradeCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;
}
```

```ts
// list-evaluations-query.dto.ts
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';

const KNOWN_CATEGORIES: GradeCategory[] = ['actividad', 'evaluacion_bimestral', 'disciplina'];

export class ListEvaluationsQueryDto {
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  periodId?: string;

  @IsOptional()
  @IsIn(KNOWN_CATEGORIES)
  category?: GradeCategory;
}
```

- [ ] **Step 8: Shared-types**

`GradeCategory` ya se agregó en el Task 7 (Step 14) — no se vuelve a declarar acá. Reemplazar solo la interfaz `Evaluation` existente en `packages/shared-types/src/index.ts` (línea ~133, donde estaba junto con `EvaluationType`; borrar `EvaluationType` también, ya no se usa):

```ts
export interface Evaluation {
  id: string;
  subjectId: string;
  sectionId: string;
  academicYearId: string;
  periodId: string;
  category: GradeCategory;
  maxScore: number;
  label: string | null;
}
```

- [ ] **Step 9: Verificar tipos y correr la suite**

Run: `cd apps/api && pnpm exec tsc --noEmit`
Expected: sin errores.

Run: `cd apps/api && pnpm test`
Expected: toda la suite pasa (los specs de `create-period`/`edit-period`/`grade-weight-config` del Task 6-7 no dependen de `Evaluation`, no deberían romperse).

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/core/database/migrations/tenant/1700000000056-ReplaceEvaluationTypeWithCategory.ts apps/api/src/modules/grading packages/shared-types/src/index.ts
git commit -m "feat(grading): Evaluation usa category/periodId ponderables en vez de type/period libre"
```

### Task 9: `GradeCalculationService` — el cálculo puro (la pieza más crítica)

**Files:**
- Create: `apps/api/src/modules/grading/domain/services/grade-calculation.service.ts`
- Create: `apps/api/src/modules/grading/domain/services/grade-calculation.service.spec.ts`

**Interfaces:**
- Consumes: `GradeCategory`/`GradeWeightConfig.weightFor(category)` de Task 7.
- Produces: `EvaluationItem`, `CategoryBreakdown`, `SubjectPeriodGrade`, y los métodos estáticos `GradeCalculationService.computeSubjectPeriodGrade`, `.computeAccumulatedGrade`, `.computeAccumulatedAbsences`, `.countAbsencesBySubjectAndPeriod`, `.normalize` — consumidos por Task 11 (`GetGradebookUseCase`) y Task 12 (`GetSubjectPeriodDetailUseCase`). Es una clase de servicio de dominio: solo funciones puras, sin I/O, sin decoradores de NestJS.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { GradeCalculationService } from './grade-calculation.service';
import { GradeWeightConfig } from '../entities/grade-weight-config.entity';

describe('GradeCalculationService', () => {
  const weights = new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1);

  describe('normalize', () => {
    it('escala una nota a 0-5 según su maxScore', () => {
      expect(GradeCalculationService.normalize(8, 10)).toBe(4);
      expect(GradeCalculationService.normalize(5, 5)).toBe(5);
    });
  });

  describe('computeSubjectPeriodGrade', () => {
    it('devuelve grade null si no hay ninguna evaluación', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade([], weights);
      expect(result.grade).toBeNull();
      expect(result.isPartial).toBe(false);
    });

    it('devuelve grade null si hay evaluaciones pero ninguna calificada todavía, y las lista sin calificar', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade(
        [{ evaluationId: 'e1', category: 'actividad', label: 'Taller 2', maxScore: 5, rawScore: null }],
        weights,
      );

      expect(result.grade).toBeNull();
      const actividad = result.categories.find((c) => c.category === 'actividad')!;
      expect(actividad.average).toBeNull();
      expect(actividad.items).toEqual([
        { evaluationId: 'e1', category: 'actividad', label: 'Taller 2', maxScore: 5, rawScore: null, normalized: null },
      ]);
    });

    it('con las 3 categorías calificadas, combina con los pesos configurados sin redistribuir', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade(
        [
          { evaluationId: 'e1', category: 'actividad', label: 'Taller 1', maxScore: 5, rawScore: 4 },
          { evaluationId: 'e2', category: 'evaluacion_bimestral', label: null, maxScore: 5, rawScore: 3 },
          { evaluationId: 'e3', category: 'disciplina', label: null, maxScore: 5, rawScore: 5 },
        ],
        weights,
      );

      // 4*0.65 + 3*0.25 + 5*0.10 = 2.6 + 0.75 + 0.5 = 3.85
      expect(result.grade).toBeCloseTo(3.85, 5);
      expect(result.isPartial).toBe(false);
    });

    it('si solo una categoría tiene datos, redistribuye el peso a esa categoría (100%)', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade(
        [{ evaluationId: 'e1', category: 'actividad', label: null, maxScore: 5, rawScore: 4 }],
        weights,
      );

      expect(result.grade).toBeCloseTo(4, 5);
      expect(result.isPartial).toBe(true);
    });

    it('con dos categorías presentes, redistribuye proporcionalmente entre ellas', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade(
        [
          { evaluationId: 'e1', category: 'actividad', label: null, maxScore: 5, rawScore: 4 },
          { evaluationId: 'e2', category: 'evaluacion_bimestral', label: null, maxScore: 5, rawScore: 2 },
        ],
        weights,
      );

      // (4*0.65 + 2*0.25) / (0.65+0.25) = 3.1 / 0.9 = 3.4444...
      expect(result.grade).toBeCloseTo(3.4444, 3);
      expect(result.isPartial).toBe(true);
    });

    it('normaliza notas con escala distinta a 5 antes de promediar', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade(
        [{ evaluationId: 'e1', category: 'actividad', label: null, maxScore: 10, rawScore: 8 }],
        weights,
      );

      const actividad = result.categories.find((c) => c.category === 'actividad')!;
      expect(actividad.average).toBeCloseTo(4, 5);
    });

    it('promedia varias evaluaciones dentro de la misma categoría', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade(
        [
          { evaluationId: 'e1', category: 'actividad', label: 'Taller 1', maxScore: 5, rawScore: 4 },
          { evaluationId: 'e2', category: 'actividad', label: 'Taller 2', maxScore: 5, rawScore: 2 },
        ],
        weights,
      );

      const actividad = result.categories.find((c) => c.category === 'actividad')!;
      expect(actividad.average).toBeCloseTo(3, 5);
    });
  });

  describe('computeAccumulatedGrade', () => {
    it('trata un periodo sin nota como 0, sin redistribuir (reproduce el ejemplo de Física de la imagen)', () => {
      const result = GradeCalculationService.computeAccumulatedGrade([
        { weight: 0.25, grade: 3.48 },
        { weight: 0.25, grade: 3.11 },
        { weight: 0.25, grade: 0.94 },
        { weight: 0.25, grade: null },
      ]);

      expect(result).toBeCloseTo(1.8825, 4);
    });
  });

  describe('computeAccumulatedAbsences', () => {
    it('suma las inasistencias de todos los periodos', () => {
      expect(GradeCalculationService.computeAccumulatedAbsences([0, 1, 0, 0])).toBe(1);
      expect(GradeCalculationService.computeAccumulatedAbsences([])).toBe(0);
    });
  });

  describe('countAbsencesBySubjectAndPeriod', () => {
    const scheduleSubjectMap = new Map([
      ['sched-1', 'subject-A'],
      ['sched-2', 'subject-B'],
    ]);
    const periods = [
      { id: 'p1', startDate: '2026-01-20', endDate: '2026-03-20' },
      { id: 'p2', startDate: '2026-03-21', endDate: '2026-05-20' },
    ];

    it('agrupa por materia y periodo, ignora registros sin horario o fuera de rango', () => {
      const result = GradeCalculationService.countAbsencesBySubjectAndPeriod(
        [
          { scheduleId: 'sched-1', date: '2026-02-10' },
          { scheduleId: 'sched-1', date: '2026-02-11' },
          { scheduleId: 'sched-2', date: '2026-04-05' },
          { scheduleId: null, date: '2026-02-10' },
          { scheduleId: 'sched-1', date: '2026-12-01' },
        ],
        scheduleSubjectMap,
        periods,
      );

      expect(result.get('subject-A')?.get('p1')).toBe(2);
      expect(result.get('subject-B')?.get('p2')).toBe(1);
      expect(result.get('subject-A')?.get('p2')).toBeUndefined();
    });
  });
});
```

Run: `cd apps/api && pnpm test grade-calculation.service`
Expected: FAIL — el archivo `grade-calculation.service.ts` todavía no existe.

- [ ] **Step 2: Implementar `GradeCalculationService`**

```ts
import { GradeCategory, GradeWeightConfig } from '../entities/grade-weight-config.entity';

const CATEGORIES: GradeCategory[] = ['actividad', 'evaluacion_bimestral', 'disciplina'];

export interface EvaluationItem {
  evaluationId: string;
  category: GradeCategory;
  label: string | null;
  maxScore: number;
  /** `null` = la evaluación existe pero todavía no se cargó la nota de este estudiante. */
  rawScore: number | null;
}

export interface CategoryBreakdown {
  category: GradeCategory;
  weight: number;
  average: number | null;
  items: (EvaluationItem & { normalized: number | null })[];
}

export interface SubjectPeriodGrade {
  /** `null` = "-", ninguna categoría tiene todavía una nota cargada. */
  grade: number | null;
  /** `true` si no las 3 categorías tienen datos aún (nota "en vivo", no cerrada). */
  isPartial: boolean;
  categories: CategoryBreakdown[];
}

export interface PeriodGradeInput {
  weight: number;
  grade: number | null;
}

export class GradeCalculationService {
  static normalize(rawScore: number, maxScore: number): number {
    return (rawScore / maxScore) * 5;
  }

  static computeSubjectPeriodGrade(
    evaluationItems: EvaluationItem[],
    weights: GradeWeightConfig,
  ): SubjectPeriodGrade {
    const categories: CategoryBreakdown[] = CATEGORIES.map((category) => {
      const items = evaluationItems
        .filter((item) => item.category === category)
        .map((item) => ({
          ...item,
          normalized: item.rawScore === null ? null : GradeCalculationService.normalize(item.rawScore, item.maxScore),
        }));

      const scored = items.map((item) => item.normalized).filter((n): n is number => n !== null);
      const average = scored.length === 0 ? null : scored.reduce((sum, n) => sum + n, 0) / scored.length;

      return { category, weight: weights.weightFor(category), average, items };
    });

    const withData = categories.filter((c) => c.average !== null);
    if (withData.length === 0) {
      return { grade: null, isPartial: false, categories };
    }

    const totalWeight = withData.reduce((sum, c) => sum + c.weight, 0);
    const grade = withData.reduce((sum, c) => sum + c.average! * c.weight, 0) / totalWeight;

    return { grade, isPartial: withData.length < CATEGORIES.length, categories };
  }

  static computeAccumulatedGrade(periodGrades: PeriodGradeInput[]): number {
    return periodGrades.reduce((sum, p) => sum + p.weight * (p.grade ?? 0), 0);
  }

  static computeAccumulatedAbsences(periodAbsences: number[]): number {
    return periodAbsences.reduce((sum, n) => sum + n, 0);
  }

  /** Devuelve subjectId -> (periodId -> cantidad de ausencias). */
  static countAbsencesBySubjectAndPeriod(
    absenceRecords: { scheduleId: string | null; date: string }[],
    scheduleSubjectMap: Map<string, string>,
    periods: { id: string; startDate: string; endDate: string }[],
  ): Map<string, Map<string, number>> {
    const result = new Map<string, Map<string, number>>();

    for (const record of absenceRecords) {
      if (!record.scheduleId) continue;
      const subjectId = scheduleSubjectMap.get(record.scheduleId);
      if (!subjectId) continue;
      const period = periods.find((p) => record.date >= p.startDate && record.date <= p.endDate);
      if (!period) continue;

      if (!result.has(subjectId)) result.set(subjectId, new Map());
      const bySubject = result.get(subjectId)!;
      bySubject.set(period.id, (bySubject.get(period.id) ?? 0) + 1);
    }

    return result;
  }
}
```

- [ ] **Step 3: Correr los tests para verificar que pasan**

Run: `cd apps/api && pnpm test grade-calculation.service`
Expected: PASS — los 12 tests.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/grading/domain/services
git commit -m "feat(grading): agrega GradeCalculationService (nota ponderada, acumulada, inasistencia)"
```

### Task 10: Buscador de estudiantes del boletín

**Files:**
- Create: `apps/api/src/modules/grading/application/ports/gradebook.repository.port.ts`
- Create: `apps/api/src/modules/grading/infrastructure/repositories/typeorm-gradebook.repository.ts`
- Create: `apps/api/src/modules/grading/application/use-cases/list-gradebook-students.use-case.ts`
- Create: `apps/api/src/modules/grading/interface/dtos/list-gradebook-students-query.dto.ts`
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Produces: `GradebookStudentRow { enrollmentId, studentId, fullName, documentNumber, sectionId, sectionName }`. `GradebookRepositoryPort.searchStudents(filter): Promise<PaginatedResult<GradebookStudentRow>>`. Consumido por Task 14 (controller).

- [ ] **Step 1: Puerto**

```ts
export interface GradebookStudentRow {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  documentNumber: string | null;
  sectionId: string;
  sectionName: string;
}

export interface SearchGradebookStudentsFilter {
  academicYearId: string;
  search?: string;
  page: number;
  pageSize: number;
}

export interface PaginatedGradebookStudents {
  items: GradebookStudentRow[];
  total: number;
}

export abstract class GradebookRepositoryPort {
  abstract searchStudents(filter: SearchGradebookStudentsFilter): Promise<PaginatedGradebookStudents>;
}
```

- [ ] **Step 2: Repositorio (SQL crudo, evita el bug de TypeORM `orderBy`+`join`+`skip`/`take`)**

Sigue el mismo criterio ya documentado en
`apps/api/src/modules/documents/infrastructure/repositories/typeorm-issued-document.repository.ts`
(issues #3356/#4270/#8213/#11742 de TypeORM), pero acá además hace falta
proyectar columnas de `users`+`sections`, así que en vez de un subquery en
el `WHERE` se usa SQL crudo con `dataSource.query()` directamente — sin
pasar por el query builder de TypeORM en absoluto, sin ese riesgo.

```ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  GradebookRepositoryPort,
  GradebookStudentRow,
  PaginatedGradebookStudents,
  SearchGradebookStudentsFilter,
} from '../../application/ports/gradebook.repository.port';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

interface StudentRow {
  enrollment_id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  document_number: string | null;
  section_id: string;
  section_name: string;
}

@Injectable()
export class TypeOrmGradebookRepository extends GradebookRepositoryPort {
  constructor(@Inject(TENANT_DATA_SOURCE) private readonly dataSource: DataSource) {
    super();
  }

  async searchStudents(filter: SearchGradebookStudentsFilter): Promise<PaginatedGradebookStudents> {
    const term = filter.search?.trim() ? `%${filter.search.trim()}%` : null;
    const offset = (filter.page - 1) * filter.pageSize;

    const rows = await this.dataSource.query<StudentRow[]>(
      `
        SELECT e.id AS enrollment_id, u.id AS student_id, u.first_name, u.last_name,
               u.document_number, s.id AS section_id, s.name AS section_name
        FROM enrollments e
        INNER JOIN users u ON u.id = e.student_id
        INNER JOIN sections s ON s.id = e.section_id
        WHERE e.academic_year_id = $1 AND e.status = 'active'
          AND ($2::text IS NULL OR u.first_name ILIKE $2 OR u.last_name ILIKE $2 OR u.document_number ILIKE $2)
        ORDER BY u.first_name, u.last_name
        LIMIT $3 OFFSET $4
      `,
      [filter.academicYearId, term, filter.pageSize, offset],
    );

    const [{ count }] = await this.dataSource.query<{ count: string }[]>(
      `
        SELECT COUNT(*) AS count
        FROM enrollments e
        INNER JOIN users u ON u.id = e.student_id
        WHERE e.academic_year_id = $1 AND e.status = 'active'
          AND ($2::text IS NULL OR u.first_name ILIKE $2 OR u.last_name ILIKE $2 OR u.document_number ILIKE $2)
      `,
      [filter.academicYearId, term],
    );

    const items: GradebookStudentRow[] = rows.map((row) => ({
      enrollmentId: row.enrollment_id,
      studentId: row.student_id,
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      documentNumber: row.document_number,
      sectionId: row.section_id,
      sectionName: row.section_name,
    }));

    return { items, total: Number(count) };
  }
}
```

- [ ] **Step 3: `ListGradebookStudentsUseCase`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { GradebookRepositoryPort, GradebookStudentRow } from '../ports/gradebook.repository.port';
import { PaginatedResult } from '../../../../core/http/pagination.dto';
import { normalizePagination } from '../../../../core/http/pagination';

export interface ListGradebookStudentsInput {
  academicYearId: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ListGradebookStudentsUseCase {
  constructor(@Inject(GradebookRepositoryPort) private readonly gradebook: GradebookRepositoryPort) {}

  async execute(input: ListGradebookStudentsInput): Promise<PaginatedResult<GradebookStudentRow>> {
    const { page, pageSize } = normalizePagination(input.page, input.pageSize);
    const { items, total } = await this.gradebook.searchStudents({
      academicYearId: input.academicYearId,
      search: input.search,
      page,
      pageSize,
    });
    return { items, total, page, pageSize };
  }
}
```

- [ ] **Step 4: DTO**

```ts
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../core/http/pagination.dto';

export class ListGradebookStudentsQueryDto extends PaginationQueryDto {
  @IsUUID()
  academicYearId: string;

  @IsOptional()
  @IsString()
  search?: string;
}
```

- [ ] **Step 5: Shared-types**

```ts
export interface GradebookStudentRow {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  documentNumber: string | null;
  sectionId: string;
  sectionName: string;
}
```

- [ ] **Step 6: Verificar tipos**

Run: `cd apps/api && pnpm exec tsc --noEmit`
Expected: sin errores (el wiring del controller/módulo se hace en el Task 14, así que estos archivos quedan sin usar todavía — no genera error de compilación, solo de lint por import no usado si aplica; se resuelve al conectarlos).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/grading/application/ports/gradebook.repository.port.ts apps/api/src/modules/grading/infrastructure/repositories/typeorm-gradebook.repository.ts apps/api/src/modules/grading/application/use-cases/list-gradebook-students.use-case.ts apps/api/src/modules/grading/interface/dtos/list-gradebook-students-query.dto.ts packages/shared-types/src/index.ts
git commit -m "feat(grading): buscador de estudiantes del boletín por nombre/documento"
```

### Task 11: `GetGradebookUseCase` — el boletín completo de un estudiante

**Files:**
- Create: `apps/api/src/modules/grading/application/use-cases/get-gradebook.use-case.ts`
- Create: `apps/api/src/modules/grading/application/use-cases/get-gradebook.use-case.spec.ts`
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Consumes: `GradeCalculationService` (Task 9), `PeriodRepositoryPort` (Task 6), `EvaluationRepositoryPort`/`GradeScoreRepositoryPort` (Task 8, ya existentes), `AttendanceRecordRepositoryPort` (Task 1), `GradeWeightConfigService` (Task 7), `ScheduleRepositoryPort`/`SubjectRepositoryPort`/`SectionRepositoryPort`/`AcademicYearRepositoryPort` (ya existentes), `EnrollmentRepositoryPort`/`EnrollmentAccessService` (ya existentes), `UserRepositoryPort` (ya existente).
- Produces: `GradebookResponse { enrollmentId, studentName, sectionName, academicYearName, periods: GradebookPeriodColumn[], subjects: GradebookSubjectRow[] }` — consumido por Task 14 (controller) y por el frontend (Tasks 18-19).

- [ ] **Step 1: Shared-types primero (define el contrato de respuesta)**

```ts
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
  absences: number;
}

export interface GradebookSubjectRow {
  subjectId: string;
  subjectName: string;
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
```

- [ ] **Step 2: Escribir los tests que fallan**

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
      new AcademicYear('year-1', '2026', new Date('2026-01-01'), new Date('2026-12-01'), 'active'),
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
    attendance.findAll.mockResolvedValue([
      new AttendanceRecord('att-1', 'enr-1', 'sched-1', '2026-02-10', 'ausente'),
    ]);
    weightConfigRepo.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1));
  });

  it('rechaza si la matrícula no existe', async () => {
    enrollments.findById.mockResolvedValue(null);

    await expect(useCase.execute('enr-x', admin)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el usuario no tiene acceso a esa matrícula', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds = jest.fn().mockResolvedValue(new Set(['otra-matricula']));

    await expect(useCase.execute('enr-1', admin)).rejects.toThrow(ForbiddenException);
  });

  it('arma el boletín con una materia, la nota del periodo con datos y "-" en el que no tiene evaluaciones', async () => {
    const result = await useCase.execute('enr-1', admin);

    expect(result.studentName).toBe('Juan Pérez');
    expect(result.sectionName).toBe('Sexto Uno');
    expect(result.subjects).toHaveLength(1);

    const biologia = result.subjects[0];
    expect(biologia.subjectName).toBe('Biología');
    expect(biologia.periods[0].grade).toBeCloseTo(4, 5); // única categoría con datos -> redistribuida
    expect(biologia.periods[0].isPartial).toBe(true);
    expect(biologia.periods[0].absences).toBe(1);
    expect(biologia.periods[1].grade).toBeNull(); // sin evaluaciones en p2
    expect(biologia.periods[1].absences).toBe(0);
    // Acumulada: (4*0.25 + 0*0.25) = 1
    expect(biologia.accumulatedGrade).toBeCloseTo(1, 5);
    expect(biologia.accumulatedAbsences).toBe(1);
  });
});
```

- [ ] **Step 3: Correr los tests para verificar que fallan**

Run: `cd apps/api && pnpm test get-gradebook.use-case`
Expected: FAIL — el archivo `get-gradebook.use-case.ts` todavía no existe.

- [ ] **Step 4: Implementar `GetGradebookUseCase`**

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
  absences: number;
}

export interface GradebookSubjectRow {
  subjectId: string;
  subjectName: string;
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

    const [student, section, academicYear, periodsForYear, schedulesForSection, allSubjects, evaluationsForSection, scoresForEnrollment, attendanceForEnrollment, weights] =
      await Promise.all([
        this.users.findById(enrollment.studentId),
        this.sections.findById(enrollment.sectionId),
        this.academicYears.findById(enrollment.academicYearId),
        this.periods.findAll({ academicYearId: enrollment.academicYearId }),
        this.schedules.findAll({ sectionId: enrollment.sectionId, academicYearId: enrollment.academicYearId }),
        this.subjects.findAll(),
        this.evaluations.findAll({ sectionId: enrollment.sectionId, academicYearId: enrollment.academicYearId }),
        this.scores.findAll({ enrollmentId }),
        this.attendance.findAll({ enrollmentId }),
        this.weightConfigService.getOrCreateDefault(),
      ]);

    const sortedPeriods = [...periodsForYear].sort((a, b) => a.order - b.order);
    const scheduleSubjectMap = new Map(schedulesForSection.map((s) => [s.id, s.subjectId]));
    const subjectIds = [...new Set(schedulesForSection.map((s) => s.subjectId))];
    const subjectNameById = new Map(allSubjects.map((s) => [s.id, s.name]));
    const scoreByEvaluationId = new Map(scoresForEnrollment.map((s) => [s.evaluationId, s.score]));

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
          return { periodId: period.id, grade, isPartial, absences };
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

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `cd apps/api && pnpm test get-gradebook.use-case`
Expected: PASS — los 3 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/grading/application/use-cases/get-gradebook.use-case.ts apps/api/src/modules/grading/application/use-cases/get-gradebook.use-case.spec.ts packages/shared-types/src/index.ts
git commit -m "feat(grading): agrega GetGradebookUseCase (boletín completo por estudiante)"
```

### Task 12: `GetSubjectPeriodDetailUseCase` — el desglose para el modal de consulta

**Files:**
- Create: `apps/api/src/modules/grading/application/use-cases/get-subject-period-detail.use-case.ts`
- Create: `apps/api/src/modules/grading/application/use-cases/get-subject-period-detail.use-case.spec.ts`
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Consumes: `GradeCalculationService.computeSubjectPeriodGrade` (Task 9) — devuelve directamente `categories` en la forma que necesita la respuesta, sin transformación extra.
- Produces: `SubjectPeriodDetailResponse { subjectId, subjectName, periodId, periodName, grade, isPartial, categories }`. Consumido por Task 14 (controller) y el frontend (Task 20, `SubjectPeriodDetailModal`).

- [ ] **Step 1: Shared-types**

```ts
export interface GradebookCategoryItem {
  evaluationId: string;
  category: GradeCategory;
  label: string | null;
  maxScore: number;
  rawScore: number | null;
  normalized: number | null;
}

export interface GradebookCategoryBreakdown {
  category: GradeCategory;
  weight: number;
  average: number | null;
  items: GradebookCategoryItem[];
}

export interface SubjectPeriodDetailResponse {
  subjectId: string;
  subjectName: string;
  periodId: string;
  periodName: string;
  grade: number | null;
  isPartial: boolean;
  categories: GradebookCategoryBreakdown[];
}
```

- [ ] **Step 2: Escribir los tests que fallan**

```ts
import { NotFoundException } from '@nestjs/common';
import { GetSubjectPeriodDetailUseCase } from './get-subject-period-detail.use-case';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { Subject } from '../../../academic/domain/entities/subject.entity';
import { Period } from '../../../academic/domain/entities/period.entity';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('GetSubjectPeriodDetailUseCase', () => {
  const enrollments = { findAll: jest.fn(), findById: jest.fn(), findActiveByStudentAndYear: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EnrollmentRepositoryPort>;
  const subjects = { findAll: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<SubjectRepositoryPort>;
  const periods = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<PeriodRepositoryPort>;
  const evaluations = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EvaluationRepositoryPort>;
  const scores = { findAll: jest.fn(), upsertMany: jest.fn() } as unknown as jest.Mocked<GradeScoreRepositoryPort>;
  const weightConfigRepo = { findFirst: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<GradeWeightConfigRepositoryPort>;
  const weightConfigService = new GradeWeightConfigService(weightConfigRepo);
  const enrollmentAccess = { resolveAccessibleEnrollmentIds: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new GetSubjectPeriodDetailUseCase(
    enrollments,
    subjects,
    periods,
    evaluations,
    scores,
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
    weightConfigRepo.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1));
  });

  it('rechaza si el periodo no existe o no es de ese año lectivo', async () => {
    periods.findById.mockResolvedValue(null);

    await expect(useCase.execute('enr-1', 'subject-1', 'p-x', admin)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si la materia no existe', async () => {
    subjects.findAll.mockResolvedValue([]);

    await expect(useCase.execute('enr-1', 'subject-x', 'p1', admin)).rejects.toThrow(NotFoundException);
  });

  it('devuelve el desglose por categoría con la evaluación cargada', async () => {
    const result = await useCase.execute('enr-1', 'subject-1', 'p1', admin);

    expect(result.subjectName).toBe('Biología');
    expect(result.periodName).toBe('Primer periodo');
    expect(result.grade).toBeCloseTo(4, 5);
    expect(result.isPartial).toBe(true);
    const actividad = result.categories.find((c) => c.category === 'actividad')!;
    expect(actividad.items).toEqual([
      { evaluationId: 'eval-1', category: 'actividad', label: 'Taller 1', maxScore: 5, rawScore: 4, normalized: 4 },
    ]);
  });
});
```

- [ ] **Step 3: Correr los tests para verificar que fallan**

Run: `cd apps/api && pnpm test get-subject-period-detail.use-case`
Expected: FAIL.

- [ ] **Step 4: Implementar `GetSubjectPeriodDetailUseCase`**

```ts
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
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

    const [allSubjects, subjectEvaluations, scoresForEnrollment, weights] = await Promise.all([
      this.subjects.findAll(),
      this.evaluations.findAll({
        sectionId: enrollment.sectionId,
        academicYearId: enrollment.academicYearId,
        subjectId,
        periodId,
      }),
      this.scores.findAll({ enrollmentId }),
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

    const { grade, isPartial, categories } = GradeCalculationService.computeSubjectPeriodGrade(items, weights);

    return { subjectId, subjectName: subject.name, periodId, periodName: period.name, grade, isPartial, categories };
  }
}
```

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `cd apps/api && pnpm test get-subject-period-detail.use-case`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/grading/application/use-cases/get-subject-period-detail.use-case.ts apps/api/src/modules/grading/application/use-cases/get-subject-period-detail.use-case.spec.ts packages/shared-types/src/index.ts
git commit -m "feat(grading): agrega GetSubjectPeriodDetailUseCase (desglose por categoría)"
```

### Task 13: `CreateGradeUseCase` — cargar una nota desde el modal de creación

**Files:**
- Create: `apps/api/src/modules/grading/application/use-cases/create-grade.use-case.ts`
- Create: `apps/api/src/modules/grading/application/use-cases/create-grade.use-case.spec.ts`
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Consumes: `Evaluation`/`EvaluationRepositoryPort` (Task 8), `GradeScore`/`GradeScoreRepositoryPort` (ya existentes), `EnrollmentAccessService.canTeacherAccessSection` (ya existente).
- Produces: `CreateGradeInput { enrollmentId, subjectId, sectionId, periodId, category, evaluationId?, label?, maxScore?, score }` → `GradeScore`. Consumido por Task 14 (controller) y el frontend (Task 20, `CreateGradeModal`).

- [ ] **Step 1: Shared-types**

```ts
export interface CreateGradeInput {
  subjectId: string;
  sectionId: string;
  periodId: string;
  category: GradeCategory;
  evaluationId?: string;
  label?: string;
  maxScore?: number;
  score: number;
}
```

- [ ] **Step 2: Escribir los tests que fallan**

```ts
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateGradeUseCase } from './create-grade.use-case';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('CreateGradeUseCase', () => {
  const enrollments = { findAll: jest.fn(), findById: jest.fn(), findActiveByStudentAndYear: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EnrollmentRepositoryPort>;
  const evaluations = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<EvaluationRepositoryPort>;
  const scores = { findAll: jest.fn(), upsertMany: jest.fn() } as unknown as jest.Mocked<GradeScoreRepositoryPort>;
  const enrollmentAccess = { canTeacherAccessSection: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new CreateGradeUseCase(enrollments, evaluations, scores, enrollmentAccess);

  const enrollment = new Enrollment('enr-1', 'student-1', 'section-1', 'year-1', 'active');
  const admin: JwtPayload = { sub: 'admin-1', roles: ['admin_institucion'], tenantId: 't1' } as JwtPayload;

  beforeEach(() => {
    jest.clearAllMocks();
    enrollments.findById.mockResolvedValue(enrollment);
    enrollmentAccess.canTeacherAccessSection = jest.fn().mockResolvedValue(true);
  });

  it('rechaza si la matrícula no existe', async () => {
    enrollments.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        'enr-x',
        { subjectId: 'subject-1', sectionId: 'section-1', periodId: 'p1', category: 'actividad', score: 4 },
        admin,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el docente no tiene acceso a esa sección', async () => {
    enrollmentAccess.canTeacherAccessSection = jest.fn().mockResolvedValue(false);

    await expect(
      useCase.execute(
        'enr-1',
        { subjectId: 'subject-1', sectionId: 'section-1', periodId: 'p1', category: 'actividad', score: 4 },
        admin,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza si sectionId no coincide con la sección real de la matrícula', async () => {
    await expect(
      useCase.execute(
        'enr-1',
        { subjectId: 'subject-1', sectionId: 'otra-sección', periodId: 'p1', category: 'actividad', score: 4 },
        admin,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('crea una evaluación nueva y la nota cuando no se pasa evaluationId', async () => {
    const result = await useCase.execute(
      'enr-1',
      {
        subjectId: 'subject-1',
        sectionId: 'section-1',
        periodId: 'p1',
        category: 'actividad',
        label: 'Taller 3',
        maxScore: 5,
        score: 4,
      },
      admin,
    );

    expect(evaluations.save).toHaveBeenCalledTimes(1);
    expect(scores.upsertMany).toHaveBeenCalledTimes(1);
    expect(result.score).toBe(4);
  });

  it('rechaza si la nota está fuera de rango de la evaluación nueva', async () => {
    await expect(
      useCase.execute(
        'enr-1',
        { subjectId: 'subject-1', sectionId: 'section-1', periodId: 'p1', category: 'actividad', maxScore: 5, score: 9 },
        admin,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('reutiliza una evaluación existente cuando se pasa evaluationId, validando que coincida', async () => {
    const existing = new Evaluation('eval-1', 'subject-1', 'section-1', 'year-1', 'p1', 'actividad', 5, 'Taller 1');
    evaluations.findById.mockResolvedValue(existing);

    const result = await useCase.execute(
      'enr-1',
      { subjectId: 'subject-1', sectionId: 'section-1', periodId: 'p1', category: 'actividad', evaluationId: 'eval-1', score: 3 },
      admin,
    );

    expect(evaluations.save).not.toHaveBeenCalled();
    expect(result.evaluationId).toBe('eval-1');
  });

  it('rechaza si evaluationId no pertenece a esa materia/periodo/categoría', async () => {
    const existing = new Evaluation('eval-1', 'otra-materia', 'section-1', 'year-1', 'p1', 'actividad', 5, null);
    evaluations.findById.mockResolvedValue(existing);

    await expect(
      useCase.execute(
        'enr-1',
        { subjectId: 'subject-1', sectionId: 'section-1', periodId: 'p1', category: 'actividad', evaluationId: 'eval-1', score: 3 },
        admin,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 3: Correr los tests para verificar que fallan**

Run: `cd apps/api && pnpm test create-grade.use-case`
Expected: FAIL.

- [ ] **Step 4: Implementar `CreateGradeUseCase`**

```ts
import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface CreateGradeInput {
  subjectId: string;
  sectionId: string;
  periodId: string;
  category: GradeCategory;
  evaluationId?: string;
  label?: string;
  maxScore?: number;
  score: number;
}

@Injectable()
export class CreateGradeUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    @Inject(GradeScoreRepositoryPort) private readonly scores: GradeScoreRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(enrollmentId: string, input: CreateGradeInput, currentUser: JwtPayload): Promise<GradeScore> {
    const enrollment = await this.enrollments.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${enrollmentId}"`);
    }

    const canAccess = await this.enrollmentAccess.canTeacherAccessSection(currentUser, input.sectionId);
    if (!canAccess) {
      throw new ForbiddenException('No tenés un horario asignado en esa sección');
    }

    if (input.sectionId !== enrollment.sectionId) {
      throw new BadRequestException('La sección no corresponde a la sección real de esa matrícula');
    }

    let evaluation: Evaluation;
    if (input.evaluationId) {
      const existing = await this.evaluations.findById(input.evaluationId);
      if (!existing) {
        throw new NotFoundException(`No existe la evaluación "${input.evaluationId}"`);
      }
      if (
        existing.subjectId !== input.subjectId ||
        existing.sectionId !== input.sectionId ||
        existing.periodId !== input.periodId ||
        existing.category !== input.category
      ) {
        throw new BadRequestException('Esa evaluación no corresponde a esta materia/periodo/categoría');
      }
      evaluation = existing;
    } else {
      evaluation = new Evaluation(
        randomUUID(),
        input.subjectId,
        input.sectionId,
        enrollment.academicYearId,
        input.periodId,
        input.category,
        input.maxScore ?? 10,
        input.label ?? null,
      );
      await this.evaluations.save(evaluation);
    }

    if (input.score < 0 || input.score > evaluation.maxScore) {
      throw new BadRequestException(`La nota ${input.score} está fuera de rango (0-${evaluation.maxScore})`);
    }

    const gradeScore = new GradeScore(randomUUID(), evaluation.id, enrollmentId, input.score);
    await this.scores.upsertMany([gradeScore]);
    return gradeScore;
  }
}
```

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `cd apps/api && pnpm test create-grade.use-case`
Expected: PASS — los 7 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/grading/application/use-cases/create-grade.use-case.ts apps/api/src/modules/grading/application/use-cases/create-grade.use-case.spec.ts packages/shared-types/src/index.ts
git commit -m "feat(grading): agrega CreateGradeUseCase (carga de nota desde administración)"
```

### Task 14: `GradebookController` y wiring final de `GradingModule`

**Files:**
- Create: `apps/api/src/modules/grading/interface/dtos/get-subject-period-detail-query.dto.ts`
- Create: `apps/api/src/modules/grading/interface/dtos/create-grade.dto.ts`
- Create: `apps/api/src/modules/grading/interface/controllers/gradebook.controller.ts`
- Modify: `apps/api/src/modules/grading/grading.module.ts`

**Interfaces:**
- Consumes: todos los use-cases de Tasks 7, 10, 11, 12, 13.
- Produces: los 4 endpoints HTTP consumidos por el frontend en las Tasks 17-19 — `GET /grading/gradebook/students`, `GET /grading/gradebook/:enrollmentId`, `GET /grading/gradebook/:enrollmentId/subject-period`, `POST /grading/gradebook/:enrollmentId/grades`.

- [ ] **Step 1: DTOs**

```ts
// get-subject-period-detail-query.dto.ts
import { IsUUID } from 'class-validator';

export class GetSubjectPeriodDetailQueryDto {
  @IsUUID()
  subjectId: string;

  @IsUUID()
  periodId: string;
}
```

```ts
// create-grade.dto.ts
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';

const KNOWN_CATEGORIES: GradeCategory[] = ['actividad', 'evaluacion_bimestral', 'disciplina'];

export class CreateGradeDto {
  @IsUUID()
  subjectId: string;

  @IsUUID()
  sectionId: string;

  @IsUUID()
  periodId: string;

  @IsIn(KNOWN_CATEGORIES)
  category: GradeCategory;

  @IsOptional()
  @IsUUID()
  evaluationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @IsNumber()
  @Min(0)
  score: number;
}
```

- [ ] **Step 2: Controller**

El endpoint estático `students` se declara antes que `:enrollmentId` — NestJS matchea rutas en el orden en que se declaran dentro del mismo controller, así que si `:enrollmentId` fuera primero capturaría `students` como un id.

```ts
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { ListGradebookStudentsUseCase } from '../../application/use-cases/list-gradebook-students.use-case';
import { GetGradebookUseCase } from '../../application/use-cases/get-gradebook.use-case';
import { GetSubjectPeriodDetailUseCase } from '../../application/use-cases/get-subject-period-detail.use-case';
import { CreateGradeUseCase } from '../../application/use-cases/create-grade.use-case';
import { ListGradebookStudentsQueryDto } from '../dtos/list-gradebook-students-query.dto';
import { GetSubjectPeriodDetailQueryDto } from '../dtos/get-subject-period-detail-query.dto';
import { CreateGradeDto } from '../dtos/create-grade.dto';

@Controller('grading/gradebook')
export class GradebookController {
  constructor(
    private readonly listStudents: ListGradebookStudentsUseCase,
    private readonly getGradebook: GetGradebookUseCase,
    private readonly getSubjectPeriodDetail: GetSubjectPeriodDetailUseCase,
    private readonly createGrade: CreateGradeUseCase,
  ) {}

  @Get('students')
  @CheckPolicies((ability) => ability.can('read', 'Grading'))
  async searchStudents(@Query() query: ListGradebookStudentsQueryDto) {
    return this.listStudents.execute(query);
  }

  @Get(':enrollmentId')
  @CheckPolicies((ability) => ability.can('read', 'Grading'))
  async get(@Param('enrollmentId') enrollmentId: string, @CurrentUser() user: JwtPayload) {
    return this.getGradebook.execute(enrollmentId, user);
  }

  @Get(':enrollmentId/subject-period')
  @CheckPolicies((ability) => ability.can('read', 'Grading'))
  async getSubjectPeriod(
    @Param('enrollmentId') enrollmentId: string,
    @Query() query: GetSubjectPeriodDetailQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getSubjectPeriodDetail.execute(enrollmentId, query.subjectId, query.periodId, user);
  }

  @Post(':enrollmentId/grades')
  @CheckPolicies((ability) => ability.can('create', 'Grading'))
  async create(
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: CreateGradeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createGrade.execute(enrollmentId, dto, user);
  }
}
```

- [ ] **Step 3: Wiring final de `GradingModule`**

Reemplazar el contenido completo de `grading.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { EvaluationsController } from './interface/controllers/evaluations.controller';
import { ScoresController } from './interface/controllers/scores.controller';
import { GradeWeightConfigController } from './interface/controllers/grade-weight-config.controller';
import { GradebookController } from './interface/controllers/gradebook.controller';
import { CreateEvaluationUseCase } from './application/use-cases/create-evaluation.use-case';
import { ListEvaluationsUseCase } from './application/use-cases/list-evaluations.use-case';
import { RecordScoresUseCase } from './application/use-cases/record-scores.use-case';
import { ListScoresUseCase } from './application/use-cases/list-scores.use-case';
import { GetGradeWeightConfigUseCase } from './application/use-cases/get-grade-weight-config.use-case';
import { EditGradeWeightConfigUseCase } from './application/use-cases/edit-grade-weight-config.use-case';
import { ListGradebookStudentsUseCase } from './application/use-cases/list-gradebook-students.use-case';
import { GetGradebookUseCase } from './application/use-cases/get-gradebook.use-case';
import { GetSubjectPeriodDetailUseCase } from './application/use-cases/get-subject-period-detail.use-case';
import { CreateGradeUseCase } from './application/use-cases/create-grade.use-case';
import { GradeWeightConfigService } from './application/services/grade-weight-config.service';
import { EvaluationRepositoryPort } from './application/ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from './application/ports/grade-score.repository.port';
import { GradeWeightConfigRepositoryPort } from './application/ports/grade-weight-config.repository.port';
import { GradebookRepositoryPort } from './application/ports/gradebook.repository.port';
import { TypeOrmEvaluationRepository } from './infrastructure/repositories/typeorm-evaluation.repository';
import { TypeOrmGradeScoreRepository } from './infrastructure/repositories/typeorm-grade-score.repository';
import { TypeOrmGradeWeightConfigRepository } from './infrastructure/repositories/typeorm-grade-weight-config.repository';
import { TypeOrmGradebookRepository } from './infrastructure/repositories/typeorm-gradebook.repository';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { AcademicModule } from '../academic/academic.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [EnrollmentModule, AcademicModule, AttendanceModule, ScheduleModule, IdentityModule],
  controllers: [EvaluationsController, ScoresController, GradeWeightConfigController, GradebookController],
  providers: [
    CreateEvaluationUseCase,
    ListEvaluationsUseCase,
    RecordScoresUseCase,
    ListScoresUseCase,
    GetGradeWeightConfigUseCase,
    EditGradeWeightConfigUseCase,
    ListGradebookStudentsUseCase,
    GetGradebookUseCase,
    GetSubjectPeriodDetailUseCase,
    CreateGradeUseCase,
    GradeWeightConfigService,
    { provide: EvaluationRepositoryPort, useClass: TypeOrmEvaluationRepository },
    { provide: GradeScoreRepositoryPort, useClass: TypeOrmGradeScoreRepository },
    { provide: GradeWeightConfigRepositoryPort, useClass: TypeOrmGradeWeightConfigRepository },
    { provide: GradebookRepositoryPort, useClass: TypeOrmGradebookRepository },
  ],
  exports: [EvaluationRepositoryPort, GradeScoreRepositoryPort],
})
export class GradingModule {}
```

- [ ] **Step 4: Verificar que el backend arranca**

Run: `cd apps/api && pnpm exec tsc --noEmit`
Expected: sin errores — confirma que no hay dependencia circular entre módulos (`GradingModule` ahora importa `AcademicModule`/`AttendanceModule`/`ScheduleModule`/`IdentityModule`, ninguno de esos importa `GradingModule` de vuelta).

Run: `cd apps/api && pnpm test`
Expected: toda la suite pasa (specs de Tasks 1-13 incluidos).

Run: `(cd apps/api && PORT=3031 timeout 15 pnpm dev > /tmp/grading-boot-check.log 2>&1 || true) && grep -i "error\|Nest application successfully started" /tmp/grading-boot-check.log`
Expected: aparece "Nest application successfully started" y ningún "error" — confirma que Nest resuelve el grafo de dependencias completo en runtime, no solo a nivel de tipos.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/grading/interface apps/api/src/modules/grading/grading.module.ts
git commit -m "feat(grading): expone GradebookController y conecta GradingModule con Academic/Attendance/Schedule/Identity"
```

---

## Fase 2 — Frontend

> **Nota sobre `forbidNonWhitelisted`:** el `ValidationPipe` global del backend (`apps/api/src/main.ts`) tiene `whitelist: true, forbidNonWhitelisted: true` — cualquier campo en el body que no esté declarado en el DTO del endpoint hace que el request entero falle con 400. Cada hook de este bloque manda exactamente los campos que el DTO correspondiente espera, ni uno más (ej. `EditPeriodDto` no incluye `academicYearId`, aunque `CreatePeriodDto` sí).

### Task 15: Hooks y proxy routes para `Período` y `GradeWeightConfig`

**Files:**
- Create: `apps/web/src/features/academic/use-periods.ts`
- Create: `apps/web/src/app/api/academic/periods/route.ts`
- Create: `apps/web/src/app/api/academic/periods/[id]/route.ts`
- Create: `apps/web/src/features/grading/use-grade-weight-config.ts`
- Create: `apps/web/src/app/api/grading/weight-config/route.ts`

**Interfaces:**
- Consumes: `GET/POST /academic/periods`, `PATCH /academic/periods/:id`, `GET/PATCH /grading/weight-config` (Tasks 6-7). `Period`/`GradeWeightConfig` de shared-types.
- Produces: `usePeriods(filter?)`, `useCreatePeriod()`, `useEditPeriod()`, `useGradeWeightConfig()`, `useEditGradeWeightConfig()` — consumidos por Task 16 (formulario de evaluaciones), Task 17 (`PeriodsPanel`) y Tasks 18-20 (tablero y modales).

- [ ] **Step 1: `use-periods.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Period } from '@eduapp/shared-types';

export interface PeriodFilter {
  academicYearId?: string;
}

async function fetchPeriods(filter?: PeriodFilter): Promise<Period[]> {
  const qs = filter?.academicYearId ? `?academicYearId=${filter.academicYearId}` : '';
  const res = await fetch(`/api/academic/periods${qs}`);
  if (!res.ok) throw new Error('No se pudieron cargar los periodos');
  return res.json();
}

export interface CreatePeriodInput {
  academicYearId: string;
  name: string;
  order: number;
  weight: number;
  startDate: string;
  endDate: string;
}

async function createPeriod(input: CreatePeriodInput): Promise<Period> {
  const res = await fetch('/api/academic/periods', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo crear el periodo');
  }
  return res.json();
}

export interface EditPeriodInput {
  id: string;
  name: string;
  order: number;
  weight: number;
  startDate: string;
  endDate: string;
}

async function editPeriod({ id, ...input }: EditPeriodInput): Promise<Period> {
  const res = await fetch(`/api/academic/periods/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo editar el periodo');
  }
  return res.json();
}

export function usePeriods(filter?: PeriodFilter) {
  return useQuery({
    queryKey: ['periods', filter ?? 'all'],
    queryFn: () => fetchPeriods(filter),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPeriod,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['periods'] }),
  });
}

export function useEditPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editPeriod,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['periods'] }),
  });
}
```

- [ ] **Step 2: Proxy routes de `Período`**

```ts
// apps/web/src/app/api/academic/periods/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Period } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/academic/periods?${qs}` : '/academic/periods';
  const periods = await serverApiFetch<Period[]>(path);
  if (periods === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(periods);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const period = await serverApiFetch<Period>('/academic/periods', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (period === null) {
    return NextResponse.json({ message: 'No se pudo crear el periodo' }, { status: 400 });
  }
  return NextResponse.json(period, { status: 201 });
}
```

```ts
// apps/web/src/app/api/academic/periods/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Period } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const period = await serverApiFetch<Period>(`/academic/periods/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (period === null) {
    return NextResponse.json({ message: 'No se pudo editar el periodo' }, { status: 400 });
  }
  return NextResponse.json(period);
}
```

- [ ] **Step 3: `use-grade-weight-config.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GradeWeightConfig } from '@eduapp/shared-types';

async function fetchGradeWeightConfig(): Promise<GradeWeightConfig> {
  const res = await fetch('/api/grading/weight-config');
  if (!res.ok) throw new Error('No se pudo cargar la configuración de pesos');
  return res.json();
}

export interface EditGradeWeightConfigInput {
  actividadWeight: number;
  evaluacionBimestralWeight: number;
  disciplinaWeight: number;
}

async function editGradeWeightConfig(input: EditGradeWeightConfigInput): Promise<GradeWeightConfig> {
  const res = await fetch('/api/grading/weight-config', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo actualizar la configuración');
  }
  return res.json();
}

export function useGradeWeightConfig() {
  return useQuery({
    queryKey: ['grade-weight-config'],
    queryFn: fetchGradeWeightConfig,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEditGradeWeightConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editGradeWeightConfig,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grade-weight-config'] }),
  });
}
```

- [ ] **Step 4: Proxy route de `GradeWeightConfig`**

```ts
// apps/web/src/app/api/grading/weight-config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GradeWeightConfig } from '@eduapp/shared-types';

export async function GET() {
  const config = await serverApiFetch<GradeWeightConfig>('/grading/weight-config');
  if (config === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const config = await serverApiFetch<GradeWeightConfig>('/grading/weight-config', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (config === null) {
    return NextResponse.json({ message: 'No se pudo actualizar la configuración' }, { status: 400 });
  }
  return NextResponse.json(config);
}
```

- [ ] **Step 5: Verificar tipos**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/academic/use-periods.ts apps/web/src/app/api/academic/periods apps/web/src/features/grading/use-grade-weight-config.ts apps/web/src/app/api/grading/weight-config
git commit -m "feat(grading): hooks y proxy routes para Período y GradeWeightConfig"
```

---

### Task 16: `CreateEvaluationForm`/`EvaluationsList` usan categoría + periodo formal

**Files:**
- Modify: `apps/web/src/features/grading/use-evaluations.ts`
- Modify: `apps/web/src/features/grading/components/create-evaluation-form.tsx`
- Modify: `apps/web/src/features/grading/components/evaluations-list.tsx`

**Interfaces:**
- Consumes: `usePeriods(filter?)` (Task 15). `Evaluation`/`GradeCategory` de shared-types (Task 8).

- [ ] **Step 1: Actualizar `use-evaluations.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Evaluation, GradeCategory } from '@eduapp/shared-types';

export interface EvaluationFilter {
  sectionId?: string;
  academicYearId?: string;
  subjectId?: string;
  periodId?: string;
  category?: GradeCategory;
}

async function fetchEvaluations(filter?: EvaluationFilter): Promise<Evaluation[]> {
  const qs = filter
    ? new URLSearchParams(filter as unknown as Record<string, string>).toString()
    : '';
  const res = await fetch(qs ? `/api/grading/evaluations?${qs}` : '/api/grading/evaluations');
  if (!res.ok) throw new Error('No se pudieron cargar las evaluaciones');
  return res.json();
}

export interface CreateEvaluationInput {
  subjectId: string;
  sectionId: string;
  academicYearId: string;
  periodId: string;
  category: GradeCategory;
  maxScore?: number;
  label?: string;
}

async function createEvaluation(input: CreateEvaluationInput): Promise<Evaluation> {
  const res = await fetch('/api/grading/evaluations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear la evaluación');
  return res.json();
}

export function useEvaluations(filter?: EvaluationFilter) {
  return useQuery({
    queryKey: ['evaluations', filter ?? 'all'],
    queryFn: () => fetchEvaluations(filter),
  });
}

export function useCreateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEvaluation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluations'] }),
  });
}
```

- [ ] **Step 2: Reescribir `CreateEvaluationForm`**

```tsx
'use client';

import { FormEvent, useState } from 'react';
import { useCreateEvaluation } from '../use-evaluations';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { useSubjects } from '@/features/academic/use-subjects';
import { usePeriods } from '@/features/academic/use-periods';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GradeCategory } from '@eduapp/shared-types';

const CATEGORIES: { value: GradeCategory; label: string }[] = [
  { value: 'actividad', label: 'Actividad' },
  { value: 'evaluacion_bimestral', label: 'Evaluación bimestral' },
  { value: 'disciplina', label: 'Disciplina' },
];

export function CreateEvaluationForm() {
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();
  const { data: subjects } = useSubjects();
  const createEvaluation = useCreateEvaluation();

  const [academicYearId, setAcademicYearId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [category, setCategory] = useState<GradeCategory>('actividad');
  const [label, setLabel] = useState('');
  const [maxScore, setMaxScore] = useState('10');

  const { data: periods } = usePeriods(academicYearId ? { academicYearId } : undefined);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!academicYearId || !sectionId || !subjectId || !periodId) return;
    createEvaluation.mutate(
      {
        academicYearId,
        sectionId,
        subjectId,
        periodId,
        category,
        maxScore: Number(maxScore),
        label: label.trim() || undefined,
      },
      { onSuccess: () => setLabel('') },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="academicYearId">Año lectivo</Label>
        <select
          id="academicYearId"
          required
          value={academicYearId}
          onChange={(e) => {
            setAcademicYearId(e.target.value);
            setPeriodId('');
          }}
          className="flex h-10 w-36 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
          className="flex h-10 w-32 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
        <Label htmlFor="periodId">Período</Label>
        <select
          id="periodId"
          required
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          disabled={!academicYearId}
          className="flex h-10 w-36 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
        >
          <option value="" disabled>
            Período
          </option>
          {periods?.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="category">Categoría</Label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as GradeCategory)}
          className="flex h-10 w-44 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="label">Etiqueta (opcional)</Label>
        <Input
          id="label"
          placeholder="Taller 1"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-32"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="maxScore">Nota máxima</Label>
        <Input
          id="maxScore"
          type="number"
          min={1}
          className="w-24"
          value={maxScore}
          onChange={(e) => setMaxScore(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createEvaluation.isPending}>
        {createEvaluation.isPending ? 'Creando...' : 'Crear evaluación'}
      </Button>
      {createEvaluation.isError && (
        <p className="w-full text-sm text-destructive">No se pudo crear la evaluación.</p>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Reescribir `EvaluationsList`**

```tsx
'use client';

import { useEvaluations } from '../use-evaluations';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { useSubjects } from '@/features/academic/use-subjects';
import { usePeriods } from '@/features/academic/use-periods';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import type { GradeCategory } from '@eduapp/shared-types';

const CATEGORY_LABELS: Record<GradeCategory, string> = {
  actividad: 'Actividad',
  evaluacion_bimestral: 'Evaluación bimestral',
  disciplina: 'Disciplina',
};

export function EvaluationsList() {
  const { data: evaluations, isLoading, error } = useEvaluations();
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();
  const { data: subjects } = useSubjects();
  const { data: periods } = usePeriods();

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las evaluaciones.</p>;
  if (!evaluations || evaluations.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay evaluaciones.</p>;
  }

  const yearNameById = new Map(years?.map((y) => [y.id, y.name]));
  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));
  const subjectNameById = new Map(subjects?.map((s) => [s.id, s.name]));
  const periodNameById = new Map(periods?.map((p) => [p.id, p.name]));

  return (
    <ul className="space-y-2">
      {evaluations.map((evaluation) => (
        <Card key={evaluation.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">
              {subjectNameById.get(evaluation.subjectId) ?? evaluation.subjectId} —{' '}
              {periodNameById.get(evaluation.periodId) ?? evaluation.periodId}
              {evaluation.label ? ` — ${evaluation.label}` : ''}
            </p>
            <p className="text-sm text-muted-foreground">
              {yearNameById.get(evaluation.academicYearId) ?? evaluation.academicYearId} — Sección{' '}
              {sectionNameById.get(evaluation.sectionId) ?? evaluation.sectionId} — máx.{' '}
              {evaluation.maxScore}
            </p>
          </div>
          <span className="text-xs uppercase text-muted-foreground">
            {CATEGORY_LABELS[evaluation.category]}
          </span>
        </Card>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Verificar tipos**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: sin errores. La verificación interactiva en navegador (elegir un período real, confirmar que la lista muestra categoría+periodo) se hace en el Task 17, una vez que exista una UI para crear períodos — antes de eso no hay ningún período cargado para probar el selector.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/grading/use-evaluations.ts apps/web/src/features/grading/components/create-evaluation-form.tsx apps/web/src/features/grading/components/evaluations-list.tsx
git commit -m "feat(grading): CreateEvaluationForm/EvaluationsList usan categoría + periodo formal"
```

---

### Task 17: `PeriodsPanel` — gestión de períodos por año lectivo

**Files:**
- Create: `apps/web/src/features/academic/components/periods-panel.tsx`
- Modify: `apps/web/src/app/(dashboard)/academic/years/page.tsx`

**Interfaces:**
- Consumes: `usePeriods`/`useCreatePeriod`/`useEditPeriod` (Task 15). Sigue el mismo patrón de "lista con edición inline" ya usado en `grades-list.tsx` (`apps/web/src/features/academic/components/grades-list.tsx`).

- [ ] **Step 1: Crear `PeriodsPanel`**

```tsx
'use client';

import { FormEvent, useState } from 'react';
import { useAcademicYears } from '../use-academic-years';
import { usePeriods, useCreatePeriod, useEditPeriod } from '../use-periods';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import type { Period } from '@eduapp/shared-types';

export function PeriodsPanel({ canManage = false }: { canManage?: boolean }) {
  const { data: years } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState('');

  const { data: periods, isLoading, error } = usePeriods(
    academicYearId ? { academicYearId } : undefined,
  );
  const createPeriod = useCreatePeriod();
  const editPeriod = useEditPeriod();

  const [name, setName] = useState('');
  const [order, setOrder] = useState('');
  const [weight, setWeight] = useState('25');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const totalWeightPercent = Math.round((periods ?? []).reduce((sum, p) => sum + p.weight, 0) * 100);

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!academicYearId || !name.trim() || order.trim() === '' || !startDate || !endDate) return;
    createPeriod.mutate(
      { academicYearId, name, order: Number(order), weight: Number(weight) / 100, startDate, endDate },
      {
        onSuccess: () => {
          setName('');
          setOrder('');
          setWeight('25');
          setStartDate('');
          setEndDate('');
        },
      },
    );
  }

  function startEditing(period: Period) {
    setEditingId(period.id);
    setEditName(period.name);
    setEditOrder(String(period.order));
    setEditWeight(String(Math.round(period.weight * 100)));
    setEditStartDate(period.startDate);
    setEditEndDate(period.endDate);
  }

  function saveEdit(id: string) {
    if (!editName.trim() || editOrder.trim() === '' || !editStartDate || !editEndDate) return;
    editPeriod.mutate(
      {
        id,
        name: editName,
        order: Number(editOrder),
        weight: Number(editWeight) / 100,
        startDate: editStartDate,
        endDate: editEndDate,
      },
      { onSuccess: () => setEditingId(null) },
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Períodos</h2>
      <div className="space-y-1.5">
        <Label htmlFor="periodsYear">Año lectivo</Label>
        <select
          id="periodsYear"
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          className="flex h-10 w-48 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Selecciona un año
          </option>
          {years?.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </div>

      {academicYearId && (
        <>
          {isLoading && <LoadingState />}
          {error && <p className="text-sm text-destructive">No se pudieron cargar los periodos.</p>}
          {periods && periods.length === 0 && (
            <p className="text-sm text-muted-foreground">Ese año lectivo todavía no tiene periodos.</p>
          )}
          {periods && periods.length > 0 && (
            <>
              <ul className="space-y-2">
                {periods.map((period) => {
                  const isEditing = editingId === period.id;
                  return (
                    <Card key={period.id} className="py-3">
                      {isEditing ? (
                        <div className="flex flex-wrap items-end gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="max-w-[10rem]"
                          />
                          <Input
                            type="number"
                            min={1}
                            value={editOrder}
                            onChange={(e) => setEditOrder(e.target.value)}
                            className="w-16"
                          />
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                            className="w-20"
                          />
                          <Input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                          />
                          <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
                          <Button type="button" disabled={editPeriod.isPending} onClick={() => saveEdit(period.id)}>
                            Guardar
                          </Button>
                          <Button variant="ghost" type="button" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                          {editPeriod.isError && (
                            <p className="w-full text-sm text-destructive">{editPeriod.error.message}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {period.order}. {period.name}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {period.startDate} – {period.endDate}
                            </span>
                            <span className="text-xs uppercase text-muted-foreground">
                              {Math.round(period.weight * 100)}%
                            </span>
                            {canManage && (
                              <button
                                type="button"
                                className="text-xs text-muted-foreground underline hover:text-foreground"
                                onClick={() => startEditing(period)}
                              >
                                Editar
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                Suma de pesos: {totalWeightPercent}%
                {totalWeightPercent !== 100 && ' — todavía no llega a 100%'}
              </p>
            </>
          )}

          {canManage && (
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="periodName">Nombre</Label>
                <Input
                  id="periodName"
                  placeholder="Primer periodo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="periodOrder">Orden</Label>
                <Input
                  id="periodOrder"
                  type="number"
                  min={1}
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className="w-16"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="periodWeight">Peso (%)</Label>
                <Input
                  id="periodWeight"
                  type="number"
                  min={1}
                  max={100}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="periodStart">Desde</Label>
                <Input id="periodStart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="periodEnd">Hasta</Label>
                <Input id="periodEnd" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <Button type="submit" disabled={createPeriod.isPending}>
                {createPeriod.isPending ? 'Creando...' : 'Agregar periodo'}
              </Button>
              {createPeriod.isError && (
                <p className="w-full text-sm text-destructive">{createPeriod.error.message}</p>
              )}
            </form>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wirear en la page de años lectivos**

```tsx
import { AcademicYearsList } from '@/features/academic/components/academic-years-list';
import { CreateAcademicYearForm } from '@/features/academic/components/create-academic-year-form';
import { PeriodsPanel } from '@/features/academic/components/periods-panel';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAcademic } from '@/lib/permissions';

export default async function AcademicYearsPage() {
  const user = await getCurrentUser();
  const canManage = canManageAcademic(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión académica: años lectivos de la institución.
        </p>
      </div>

      {canManage && <CreateAcademicYearForm />}
      <AcademicYearsList />
      <PeriodsPanel canManage={canManage} />
    </main>
  );
}
```

- [ ] **Step 3: Verificar tipos y probar en el navegador**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: sin errores.

Con los servidores levantados, ir a `/academic/years` como admin: elegir un año lectivo, agregar 2-3 periodos con pesos que sumen 100%, confirmar que aparecen en la lista ordenados y que el aviso de "no llega a 100%" desaparece cuando la suma cierra. Editar uno y confirmar que persiste. Después, volver a `/grading` y confirmar que el formulario de evaluaciones (Task 16) ahora sí lista esos periodos en el selector.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/academic/components/periods-panel.tsx apps/web/src/app/\(dashboard\)/academic/years/page.tsx
git commit -m "feat(academic): agrega gestión de períodos por año lectivo"
```

---

### Task 18: `use-gradebook.ts` — hook y proxy routes de los 4 endpoints del boletín

**Files:**
- Create: `apps/web/src/features/grading/use-gradebook.ts`
- Create: `apps/web/src/app/api/grading/gradebook/students/route.ts`
- Create: `apps/web/src/app/api/grading/gradebook/[enrollmentId]/route.ts`
- Create: `apps/web/src/app/api/grading/gradebook/[enrollmentId]/subject-period/route.ts`
- Create: `apps/web/src/app/api/grading/gradebook/[enrollmentId]/grades/route.ts`

**Interfaces:**
- Consumes: los 4 endpoints de `GradebookController` (Task 14). `toQueryString` (ya existente, `@/lib/utils` — evita el bug ya documentado de `new URLSearchParams` serializando `undefined` como el string literal `"undefined"`).
- Produces: `useGradebookStudents`, `useGradebook`, `useSubjectPeriodDetail`, `useCreateGrade` — consumidos por Task 19 (buscador+tabla) y Task 20 (modales).

- [ ] **Step 1: `use-gradebook.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  GradebookStudentRow,
  GradebookResponse,
  SubjectPeriodDetailResponse,
  CreateGradeInput,
  GradeScore,
  PaginatedResult,
} from '@eduapp/shared-types';
import { toQueryString } from '@/lib/utils';

export interface SearchGradebookStudentsFilter {
  academicYearId: string;
  search?: string;
  page: number;
  pageSize: number;
}

async function searchGradebookStudents(
  filter: SearchGradebookStudentsFilter,
): Promise<PaginatedResult<GradebookStudentRow>> {
  const qs = toQueryString(filter);
  const res = await fetch(`/api/grading/gradebook/students?${qs}`);
  if (!res.ok) throw new Error('No se pudieron buscar estudiantes');
  return res.json();
}

export function useGradebookStudents(filter: SearchGradebookStudentsFilter, enabled: boolean) {
  return useQuery({
    queryKey: ['gradebook-students', filter],
    queryFn: () => searchGradebookStudents(filter),
    enabled,
  });
}

async function fetchGradebook(enrollmentId: string): Promise<GradebookResponse> {
  const res = await fetch(`/api/grading/gradebook/${enrollmentId}`);
  if (!res.ok) throw new Error('No se pudo cargar el boletín');
  return res.json();
}

export function useGradebook(enrollmentId: string | null) {
  return useQuery({
    queryKey: ['gradebook', enrollmentId],
    queryFn: () => fetchGradebook(enrollmentId!),
    enabled: enrollmentId !== null,
  });
}

async function fetchSubjectPeriodDetail(
  enrollmentId: string,
  subjectId: string,
  periodId: string,
): Promise<SubjectPeriodDetailResponse> {
  const qs = toQueryString({ subjectId, periodId });
  const res = await fetch(`/api/grading/gradebook/${enrollmentId}/subject-period?${qs}`);
  if (!res.ok) throw new Error('No se pudo cargar el detalle de la nota');
  return res.json();
}

export function useSubjectPeriodDetail(
  enrollmentId: string | null,
  subjectId: string | null,
  periodId: string | null,
) {
  return useQuery({
    queryKey: ['gradebook-subject-period', enrollmentId, subjectId, periodId],
    queryFn: () => fetchSubjectPeriodDetail(enrollmentId!, subjectId!, periodId!),
    enabled: enrollmentId !== null && subjectId !== null && periodId !== null,
  });
}

export interface CreateGradeMutationInput extends CreateGradeInput {
  enrollmentId: string;
}

async function createGrade({ enrollmentId, ...input }: CreateGradeMutationInput): Promise<GradeScore> {
  const res = await fetch(`/api/grading/gradebook/${enrollmentId}/grades`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo guardar la nota');
  }
  return res.json();
}

export function useCreateGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGrade,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gradebook', variables.enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['gradebook-subject-period', variables.enrollmentId] });
    },
  });
}
```

- [ ] **Step 2: Proxy route del buscador**

```ts
// apps/web/src/app/api/grading/gradebook/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GradebookStudentRow, PaginatedResult } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const students = await serverApiFetch<PaginatedResult<GradebookStudentRow>>(
    `/grading/gradebook/students?${qs}`,
  );
  if (students === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(students);
}
```

- [ ] **Step 3: Proxy route del boletín completo**

```ts
// apps/web/src/app/api/grading/gradebook/[enrollmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GradebookResponse } from '@eduapp/shared-types';

export async function GET(_req: NextRequest, { params }: { params: { enrollmentId: string } }) {
  const gradebook = await serverApiFetch<GradebookResponse>(`/grading/gradebook/${params.enrollmentId}`);
  if (gradebook === null) {
    return NextResponse.json({ message: 'No se pudo cargar el boletín' }, { status: 400 });
  }
  return NextResponse.json(gradebook);
}
```

- [ ] **Step 4: Proxy route del detalle por materia/periodo**

```ts
// apps/web/src/app/api/grading/gradebook/[enrollmentId]/subject-period/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { SubjectPeriodDetailResponse } from '@eduapp/shared-types';

export async function GET(req: NextRequest, { params }: { params: { enrollmentId: string } }) {
  const qs = req.nextUrl.searchParams.toString();
  const detail = await serverApiFetch<SubjectPeriodDetailResponse>(
    `/grading/gradebook/${params.enrollmentId}/subject-period?${qs}`,
  );
  if (detail === null) {
    return NextResponse.json({ message: 'No se pudo cargar el detalle' }, { status: 400 });
  }
  return NextResponse.json(detail);
}
```

- [ ] **Step 5: Proxy route de creación de nota**

```ts
// apps/web/src/app/api/grading/gradebook/[enrollmentId]/grades/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GradeScore } from '@eduapp/shared-types';

export async function POST(req: NextRequest, { params }: { params: { enrollmentId: string } }) {
  const body = await req.json();
  const gradeScore = await serverApiFetch<GradeScore>(`/grading/gradebook/${params.enrollmentId}/grades`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (gradeScore === null) {
    return NextResponse.json({ message: 'No se pudo guardar la nota' }, { status: 400 });
  }
  return NextResponse.json(gradeScore, { status: 201 });
}
```

- [ ] **Step 6: Verificar tipos**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/grading/use-gradebook.ts apps/web/src/app/api/grading/gradebook
git commit -m "feat(grading): hook y proxy routes del boletín por estudiante"
```

---

### Task 19: `GradebookSearch` + `GradebookTable`

**Files:**
- Create: `apps/web/src/features/grading/components/gradebook-search.tsx`
- Create: `apps/web/src/features/grading/components/gradebook-table.tsx`

**Interfaces:**
- Consumes: `useGradebookStudents`, `useGradebook` (Task 18).
- Produces: `<GradebookSearch onSelect={(student: GradebookStudentRow) => void} />` (pasa la fila completa, no solo el id — `GradebookPanel` en la Task 20 necesita también `sectionId` para el modal de creación, que de otro modo no está disponible sin una consulta extra) y `<GradebookTable enrollmentId={string} onViewDetail={(subjectId, periodId) => void} onCreateGrade={(subjectId, periodId) => void} />` — consumidos por Task 20 (`GradebookPanel`, que compone ambos con los 2 modales).

- [ ] **Step 1: `GradebookSearch`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useGradebookStudents } from '../use-gradebook';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import type { GradebookStudentRow } from '@eduapp/shared-types';

const SEARCH_DEBOUNCE_MS = 350;
const MIN_SEARCH_LENGTH = 2;

export function GradebookSearch({ onSelect }: { onSelect: (student: GradebookStudentRow) => void }) {
  const { data: years } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setCommittedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const ready = Boolean(academicYearId && committedSearch.trim().length >= MIN_SEARCH_LENGTH);
  const { data, isLoading } = useGradebookStudents(
    { academicYearId, search: committedSearch, page: 1, pageSize: 10 },
    ready,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="gradebookYear">Año lectivo</Label>
          <select
            id="gradebookYear"
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Selecciona un año
            </option>
            {years?.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          placeholder="Buscar estudiante por nombre o documento..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          disabled={!academicYearId}
          className="w-72"
        />
      </div>

      {!academicYearId && (
        <p className="text-sm text-muted-foreground">Elegí un año lectivo para empezar a buscar.</p>
      )}
      {academicYearId && committedSearch.trim().length < MIN_SEARCH_LENGTH && (
        <p className="text-sm text-muted-foreground">Escribí al menos 2 caracteres para buscar.</p>
      )}
      {ready && isLoading && <LoadingState />}
      {ready && data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay estudiantes que coincidan con la búsqueda.</p>
      )}
      {ready && data && data.items.length > 0 && (
        <ul className="space-y-2">
          {data.items.map((student) => (
            <Card key={student.enrollmentId} className="py-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => onSelect(student)}
              >
                <div>
                  <p className="font-medium">{student.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {student.documentNumber ?? 'Sin documento'} — Sección {student.sectionName}
                  </p>
                </div>
              </button>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `GradebookTable`**

Usa `Fragment` (no el shorthand `<>`) porque cada periodo aporta 2 celdas (Nota+Inasistencia) dentro de un `.map()` — el shorthand no acepta `key`.

```tsx
'use client';

import { Fragment } from 'react';
import { useGradebook } from '../use-gradebook';
import { LoadingState } from '@/components/ui/loading-state';

function formatGrade(grade: number | null): string {
  return grade === null ? '-' : grade.toFixed(2);
}

export function GradebookTable({
  enrollmentId,
  onViewDetail,
  onCreateGrade,
}: {
  enrollmentId: string;
  onViewDetail: (subjectId: string, periodId: string) => void;
  onCreateGrade: (subjectId: string, periodId: string) => void;
}) {
  const { data: gradebook, isLoading, error } = useGradebook(enrollmentId);

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudo cargar el boletín.</p>;
  if (!gradebook) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-lg font-semibold">{gradebook.studentName}</p>
        <p className="text-sm text-muted-foreground">
          {gradebook.academicYearName} — {gradebook.sectionName}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-3 font-medium">Asignatura</th>
              {gradebook.periods.map((period) => (
                <th key={period.id} colSpan={2} className="px-2 py-2 text-center font-medium">
                  {period.name} ({Math.round(period.weight * 100)}%)
                </th>
              ))}
              <th className="px-2 py-2 text-center font-medium">Nota Acum.</th>
              <th className="px-2 py-2 text-center font-medium">Inasist. Acum.</th>
            </tr>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th />
              {gradebook.periods.map((period) => (
                <Fragment key={period.id}>
                  <th className="px-2 py-1 text-center font-normal">Nota</th>
                  <th className="px-2 py-1 text-center font-normal">Inasis.</th>
                </Fragment>
              ))}
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {gradebook.subjects.map((subject) => (
              <tr key={subject.subjectId} className="border-b border-border/60">
                <td className="py-2 pr-3 font-medium">{subject.subjectName}</td>
                {subject.periods.map((cell) => (
                  <Fragment key={cell.periodId}>
                    <td className="px-2 py-2 text-center">
                      {cell.grade === null ? (
                        <button
                          type="button"
                          className="text-muted-foreground underline hover:text-foreground"
                          onClick={() => onCreateGrade(subject.subjectId, cell.periodId)}
                        >
                          +
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="underline hover:text-primary"
                          onClick={() => onViewDetail(subject.subjectId, cell.periodId)}
                          title={cell.isPartial ? 'Nota parcial: todavía faltan categorías por cargar' : undefined}
                        >
                          {formatGrade(cell.grade)}
                          {cell.isPartial && <span className="text-muted-foreground">·</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center text-muted-foreground">{cell.absences}</td>
                  </Fragment>
                ))}
                <td className="px-2 py-2 text-center font-medium">{formatGrade(subject.accumulatedGrade)}</td>
                <td className="px-2 py-2 text-center text-muted-foreground">{subject.accumulatedAbsences}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: sin errores (ambos componentes todavía no se usan en ninguna page — se conectan en el Task 21).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/grading/components/gradebook-search.tsx apps/web/src/features/grading/components/gradebook-table.tsx
git commit -m "feat(grading): agrega GradebookSearch y GradebookTable"
```

---

### Task 20: Los 2 modales + `GradebookPanel` (orquestador)

**Files:**
- Create: `apps/web/src/features/grading/components/subject-period-detail-modal.tsx`
- Create: `apps/web/src/features/grading/components/create-grade-modal.tsx`
- Create: `apps/web/src/features/grading/components/gradebook-panel.tsx`

**Interfaces:**
- Consumes: `useSubjectPeriodDetail`, `useCreateGrade` (Task 18), `useEvaluations` (Task 16), `GradebookSearch`/`GradebookTable` (Task 19), `Dialog` (ya existente, mismo patrón que `link-guardian-modal.tsx` de la sesión anterior: lista de lo existente arriba + formulario de alta abajo).
- Produces: `<GradebookPanel />` — el único componente que la page (Task 21) necesita renderizar; internamente decide qué modal abrir según si la celda clickeada ya tiene nota o no.

- [ ] **Step 1: `SubjectPeriodDetailModal`**

```tsx
'use client';

import { useSubjectPeriodDetail } from '../use-gradebook';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

          <Button type="button" onClick={onAddGrade} className="w-full">
            Agregar nota
          </Button>
        </div>
      )}
    </Dialog>
  );
}
```

- [ ] **Step 2: `CreateGradeModal`**

```tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useEvaluations } from '../use-evaluations';
import { useCreateGrade } from '../use-gradebook';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GradeCategory } from '@eduapp/shared-types';

const CATEGORIES: { value: GradeCategory; label: string }[] = [
  { value: 'actividad', label: 'Actividad' },
  { value: 'evaluacion_bimestral', label: 'Evaluación bimestral' },
  { value: 'disciplina', label: 'Disciplina' },
];

export function CreateGradeModal({
  enrollmentId,
  subjectId,
  sectionId,
  periodId,
  initialCategory,
  onClose,
}: {
  enrollmentId: string | null;
  subjectId: string | null;
  sectionId: string | null;
  periodId: string | null;
  initialCategory: GradeCategory;
  onClose: () => void;
}) {
  const open = enrollmentId !== null && subjectId !== null && sectionId !== null && periodId !== null;

  const [category, setCategory] = useState<GradeCategory>(initialCategory);
  const [evaluationId, setEvaluationId] = useState('');
  const [label, setLabel] = useState('');
  const [maxScore, setMaxScore] = useState('5');
  const [score, setScore] = useState('');

  useEffect(() => {
    if (open) setCategory(initialCategory);
  }, [open, initialCategory]);

  const { data: candidateEvaluations } = useEvaluations(
    subjectId && periodId ? { subjectId, periodId, category } : undefined,
  );

  const createGrade = useCreateGrade();

  function handleClose() {
    setEvaluationId('');
    setLabel('');
    setMaxScore('5');
    setScore('');
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!enrollmentId || !subjectId || !sectionId || !periodId || score.trim() === '') return;
    createGrade.mutate(
      {
        enrollmentId,
        subjectId,
        sectionId,
        periodId,
        category,
        evaluationId: evaluationId || undefined,
        label: evaluationId ? undefined : label.trim() || undefined,
        maxScore: evaluationId ? undefined : Number(maxScore),
        score: Number(score),
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Agregar nota">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="grade-category">Categoría</Label>
          <select
            id="grade-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as GradeCategory);
              setEvaluationId('');
            }}
            className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="grade-evaluation">Evaluación</Label>
          <select
            id="grade-evaluation"
            value={evaluationId}
            onChange={(e) => setEvaluationId(e.target.value)}
            className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">+ Crear una nueva</option>
            {candidateEvaluations?.map((evaluation) => (
              <option key={evaluation.id} value={evaluation.id}>
                {evaluation.label ?? 'Sin nombre'} (máx. {evaluation.maxScore})
              </option>
            ))}
          </select>
        </div>

        {!evaluationId && (
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="grade-label">Nombre (opcional)</Label>
              <Input
                id="grade-label"
                placeholder="Taller 3"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="w-24 space-y-1.5">
              <Label htmlFor="grade-max">Nota máxima</Label>
              <Input
                id="grade-max"
                type="number"
                min={1}
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="grade-score">Nota del estudiante</Label>
          <Input
            id="grade-score"
            type="number"
            min={0}
            step="0.1"
            required
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={createGrade.isPending} className="w-full">
          {createGrade.isPending ? 'Guardando...' : 'Guardar nota'}
        </Button>
        {createGrade.isError && <p className="text-sm text-destructive">{createGrade.error.message}</p>}
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 3: `GradebookPanel` — orquesta búsqueda, tabla y los 2 modales**

```tsx
'use client';

import { useState } from 'react';
import { GradebookSearch } from './gradebook-search';
import { GradebookTable } from './gradebook-table';
import { SubjectPeriodDetailModal } from './subject-period-detail-modal';
import { CreateGradeModal } from './create-grade-modal';
import { Button } from '@/components/ui/button';
import type { GradeCategory } from '@eduapp/shared-types';

interface SelectedStudent {
  enrollmentId: string;
  sectionId: string;
  fullName: string;
}

interface DetailTarget {
  subjectId: string;
  periodId: string;
}

interface CreateTarget {
  subjectId: string;
  periodId: string;
  category: GradeCategory;
}

export function GradebookPanel() {
  const [student, setStudent] = useState<SelectedStudent | null>(null);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);

  return (
    <div className="space-y-4">
      {!student && (
        <GradebookSearch
          onSelect={(s) => setStudent({ enrollmentId: s.enrollmentId, sectionId: s.sectionId, fullName: s.fullName })}
        />
      )}

      {student && (
        <div className="space-y-3">
          <Button variant="ghost" type="button" onClick={() => setStudent(null)}>
            ← Volver a la búsqueda
          </Button>
          <GradebookTable
            enrollmentId={student.enrollmentId}
            onViewDetail={(subjectId, periodId) => setDetailTarget({ subjectId, periodId })}
            onCreateGrade={(subjectId, periodId) =>
              setCreateTarget({ subjectId, periodId, category: 'actividad' })
            }
          />
        </div>
      )}

      <SubjectPeriodDetailModal
        enrollmentId={student?.enrollmentId ?? null}
        subjectId={detailTarget?.subjectId ?? null}
        periodId={detailTarget?.periodId ?? null}
        onClose={() => setDetailTarget(null)}
        onAddGrade={() => {
          if (!detailTarget) return;
          setCreateTarget({ subjectId: detailTarget.subjectId, periodId: detailTarget.periodId, category: 'actividad' });
          setDetailTarget(null);
        }}
      />

      <CreateGradeModal
        enrollmentId={student?.enrollmentId ?? null}
        subjectId={createTarget?.subjectId ?? null}
        sectionId={student?.sectionId ?? null}
        periodId={createTarget?.periodId ?? null}
        initialCategory={createTarget?.category ?? 'actividad'}
        onClose={() => setCreateTarget(null)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verificar tipos**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/grading/components/subject-period-detail-modal.tsx apps/web/src/features/grading/components/create-grade-modal.tsx apps/web/src/features/grading/components/gradebook-panel.tsx
git commit -m "feat(grading): agrega los modales de detalle/creación y GradebookPanel"
```

---

### Task 21: Wirear `GradebookPanel` en `/grading` y verificación E2E completa

**Files:**
- Modify: `apps/web/src/app/(dashboard)/grading/page.tsx`

**Interfaces:**
- Consumes: `<GradebookPanel />` (Task 20).

- [ ] **Step 1: Agregar la sección "Boletín por estudiante" a la page**

```tsx
import { CreateEvaluationForm } from '@/features/grading/components/create-evaluation-form';
import { EvaluationsList } from '@/features/grading/components/evaluations-list';
import { RecordScoresForm } from '@/features/grading/components/record-scores-form';
import { GradebookPanel } from '@/features/grading/components/gradebook-panel';
import { getCurrentUser } from '@/lib/server-api';
import { canManageGrading } from '@/lib/permissions';

export default async function GradingPage() {
  const user = await getCurrentUser();
  const canManage = canManageGrading(user?.roles ?? []);

  return (
    <main className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calificaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evaluaciones y notas por sección y asignatura.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Boletín por estudiante</h2>
        <GradebookPanel />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Evaluaciones</h2>
        {canManage && <CreateEvaluationForm />}
        <EvaluationsList />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Cargar notas</h2>
        <RecordScoresForm readOnly={!canManage} />
      </section>
    </main>
  );
}
```

(el boletín se pone primero porque es el flujo principal ahora — "Evaluaciones"/"Cargar notas" quedan como el flujo docente de carga masiva por sección, sin cambios de comportamiento).

- [ ] **Step 2: Verificar tipos**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Levantar los servidores**

Run: `(cd apps/api && PORT=3031 nohup pnpm dev > /tmp/grading-api.log 2>&1 &)`
Run: `(PORT=3022 NEXT_PUBLIC_API_URL=http://localhost:3031 nohup pnpm --filter web dev > /tmp/grading-web.log 2>&1 &)`

- [ ] **Step 4: Recorrido E2E completo en el navegador (como admin)**

1. `/academic/years`: crear (o reusar) un año lectivo con 4 períodos cuyos pesos sumen 100% (ej. 25% cada uno) y fechas que no se superpongan y cubran el año.
2. `/grading` → sección "Evaluaciones": crear 2-3 evaluaciones para una materia+sección+periodo ya existente — una de categoría "Actividad" (ej. maxScore 5), una de "Evaluación bimestral", una de "Disciplina". Confirmar que la lista las muestra con la categoría y el nombre del período (no un tipo/texto libre como antes).
3. Sección "Cargar notas": cargar una nota para un estudiante en cada una de esas 3 evaluaciones (flujo docente existente, sin cambios).
4. Sección "Boletín por estudiante": elegir el año lectivo, buscar ese mismo estudiante por nombre (probar también buscarlo por número de documento), seleccionarlo.
5. En la tabla: confirmar que la materia con las 3 notas cargadas muestra un valor combinado en el periodo correspondiente (no "-"), que las demás materias/periodos sin evaluaciones muestran "-", y que "Nota Acumulada" es ese valor multiplicado por el peso del periodo (ej. si el periodo pesa 25% y la nota del periodo es 4.00, la acumulada de esa materia da 1.00).
6. Click en la nota calculada: se abre el modal de detalle, mostrando las 3 categorías con sus pesos y las 3 evaluaciones cargadas con su nota individual.
7. Click en "Agregar nota" dentro de ese modal: se cierra y abre el modal de creación, con la materia/periodo ya fijados. Cargar una nota nueva de categoría "Actividad" sin elegir una evaluación existente (crea una nueva) y confirmar que al cerrar el modal la tabla se actualiza con el nuevo promedio.
8. Click en el "+" de una celda vacía (otra materia sin evaluaciones en ningún periodo): se abre directamente el modal de creación (no el de detalle), confirmar que crear una nota ahí también actualiza la tabla.
9. Repetir el flujo de Fase 1 (Task 5) pero esta vez marcando al menos una inasistencia en un horario de la materia que se está mirando en el boletín, con fecha dentro del periodo activo, y confirmar que la columna "Inasistencia" de esa materia/periodo la refleja, y que "Inasistencia Acumulada" también.

- [ ] **Step 5: Correr toda la suite de backend una vez más de punta a punta**

Run: `cd apps/api && pnpm test`
Expected: toda la suite pasa (specs de las Tasks 1-13).

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Bajar los servidores**

Run: `ps aux | grep -E "apps/api|apps/web" | grep -v grep | awk '{print $2}' | xargs -r kill -9`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/grading/page.tsx
git commit -m "feat(grading): conecta el boletín por estudiante a la página de Calificaciones"
```
