# Módulo de logs de auditoría — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar automáticamente quién ejecutó cada acción de escritura (crear/editar/eliminar) en todos los módulos, más dos lecturas sensibles puntuales (Finanzas por estudiante, listado de Usuarios), sin instrumentar los ~50 casos de uso existentes.

**Architecture:** Un `AuditInterceptor` global (registrado vía `APP_INTERCEPTOR`, mismo mecanismo que `JwtAuthGuard`/`PoliciesGuard` en `core/auth/auth.module.ts`) captura toda request POST/PATCH/DELETE, y las GET marcadas con un decorador `@AuditRead()`. Persiste en una tabla `audit_logs` nueva, por tenant. Módulo hexagonal nuevo (`apps/api/src/modules/audit`) siguiendo el mismo patrón (domain/application/infrastructure/interface) que el resto del proyecto.

**Tech Stack:** NestJS (interceptors, `Reflector`, `SetMetadata`), TypeORM (`TENANT_DATA_SOURCE`, query builder), Next.js/React Query en el frontend (mismo patrón `keepPreviousData` + paginación ya usado en Usuarios/Matrícula).

**Spec:** `docs/superpowers/specs/2026-09-05-audit-logs-design.md`

## Global Constraints

- Tabla `audit_logs` vive en el schema de cada tenant (no hay tabla compartida entre colegios) — mismo criterio que toda tabla existente.
- `actor_email`/`actor_roles` se guardan como **snapshot al momento de la acción**, nunca como join al usuario actual.
- Un fallo al escribir el log **nunca** debe romper la request original — se loguea un warning y sigue.
- Solo `admin_institucion` puede ver `/audit` (ni `directivo` ni ningún otro rol) — mismo criterio que `canEditUsers` en `apps/web/src/lib/permissions.ts`.
- `GET /finance/charges` es lectura sensible **solo** cuando la query trae `enrollmentId` — una consulta general no cuenta.
- `GET /users` es lectura sensible siempre que se accede (no existe endpoint de "ver un usuario específico" hoy).
- Fuera de alcance: RRHH, retención/archivado, exportación, diff de valores antes/después.

---

### Task 1: Modelo de datos — migración, entidad de dominio, puerto y repositorio

**Files:**
- Create: `apps/api/src/core/database/migrations/tenant/1700000000057-CreateAuditLogs.ts`
- Create: `apps/api/src/modules/audit/domain/entities/audit-log.entity.ts`
- Create: `apps/api/src/modules/audit/application/ports/audit-log.repository.port.ts`
- Create: `apps/api/src/modules/audit/infrastructure/entities/audit-log.orm-entity.ts`
- Create: `apps/api/src/modules/audit/infrastructure/repositories/typeorm-audit-log.repository.ts`
- Test: `apps/api/src/modules/audit/infrastructure/repositories/typeorm-audit-log.repository.spec.ts`

**Interfaces:**
- Produces: `AuditLog` (domain entity, todos los campos de solo lectura excepto ninguno — es un hecho inmutable), `AuditLogRepositoryPort.record(entry: RecordAuditLogEntry): Promise<void>`, `AuditLogRepositoryPort.findAll(filter: AuditLogFilter, pagination: PaginationParams): Promise<PaginatedAuditLogs>`.
- Consumes: `PaginationParams`/`PaginatedResult` de `core/http/pagination.dto`, `TENANT_DATA_SOURCE` de `core/database/tenant-datasource.provider`.

- [ ] **Step 1: Escribir la migración**

```typescript
// apps/api/src/core/database/migrations/tenant/1700000000057-CreateAuditLogs.ts
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
```

- [ ] **Step 2: Correr la migración contra la base de dev y verificar que la tabla existe**

Run: `cd apps/api && npm run migration:run:tenant:all` (corre las migraciones pendientes contra el schema de cada tenant existente — ver `apps/api/package.json`).
Expected: la migración corre sin error. Verificar con:
`PGPASSWORD=eduapp psql -h localhost -p 5435 -U eduapp -d eduapp -c "\d tenant_colegio_demo.audit_logs"` — debe listar las columnas de arriba.

- [ ] **Step 3: Entidad de dominio**

```typescript
// apps/api/src/modules/audit/domain/entities/audit-log.entity.ts
export type AuditLogKind = 'write' | 'sensitive_read';

/**
 * Un log de auditoría es un hecho inmutable — no tiene métodos de negocio
 * ni invariantes que validar, a diferencia del resto de las entidades de
 * dominio del proyecto.
 */
export class AuditLog {
  constructor(
    public readonly id: string,
    public readonly actorId: string | null,
    public readonly actorEmail: string | null,
    public readonly actorRoles: string[] | null,
    public readonly method: string,
    public readonly route: string,
    public readonly resourceId: string | null,
    public readonly statusCode: number | null,
    public readonly success: boolean,
    public readonly kind: AuditLogKind,
    public readonly ipAddress: string | null,
    public readonly createdAt: Date,
  ) {}
}
```

- [ ] **Step 4: Puerto**

```typescript
// apps/api/src/modules/audit/application/ports/audit-log.repository.port.ts
import { AuditLog, AuditLogKind } from '../../domain/entities/audit-log.entity';
import { PaginationParams } from '../../../../core/http/pagination.dto';

export interface RecordAuditLogEntry {
  actorId: string | null;
  actorEmail: string | null;
  actorRoles: string[] | null;
  method: string;
  route: string;
  resourceId: string | null;
  statusCode: number | null;
  success: boolean;
  kind: AuditLogKind;
  ipAddress: string | null;
}

export interface AuditLogFilter {
  /** Coincidencia parcial, sin distinguir mayúsculas, contra `actorEmail` o `route`. */
  search?: string;
  kind?: AuditLogKind;
  from?: string;
  to?: string;
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  total: number;
}

export abstract class AuditLogRepositoryPort {
  abstract record(entry: RecordAuditLogEntry): Promise<void>;
  abstract findAll(filter: AuditLogFilter, pagination: PaginationParams): Promise<PaginatedAuditLogs>;
}
```

- [ ] **Step 5: Entidad ORM**

```typescript
// apps/api/src/modules/audit/infrastructure/entities/audit-log.orm-entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditLogKind } from '../../domain/entities/audit-log.entity';

@Entity({ name: 'audit_logs' })
export class AuditLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_id', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_email', nullable: true })
  actorEmail: string | null;

  @Column({ name: 'actor_roles', type: 'text', array: true, nullable: true })
  actorRoles: string[] | null;

  @Column()
  method: string;

  @Column()
  route: string;

  @Column({ name: 'resource_id', nullable: true })
  resourceId: string | null;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode: number | null;

  @Column()
  success: boolean;

  @Column()
  kind: AuditLogKind;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

- [ ] **Step 6: Repositorio TypeORM + test de integración**

```typescript
// apps/api/src/modules/audit/infrastructure/repositories/typeorm-audit-log.repository.ts
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  AuditLogFilter,
  AuditLogRepositoryPort,
  PaginatedAuditLogs,
  RecordAuditLogEntry,
} from '../../application/ports/audit-log.repository.port';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import { AuditLogOrmEntity } from '../entities/audit-log.orm-entity';
import { PaginationParams } from '../../../../core/http/pagination.dto';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmAuditLogRepository extends AuditLogRepositoryPort {
  private readonly repo: Repository<AuditLogOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AuditLogOrmEntity);
  }

  async record(entry: RecordAuditLogEntry): Promise<void> {
    await this.repo.save({ id: randomUUID(), ...entry });
  }

  async findAll(filter: AuditLogFilter, pagination: PaginationParams): Promise<PaginatedAuditLogs> {
    const query = this.repo.createQueryBuilder('log').orderBy('log.created_at', 'DESC');

    if (filter.search) {
      query.andWhere('(log.actor_email ILIKE :term OR log.route ILIKE :term)', {
        term: `%${filter.search}%`,
      });
    }
    if (filter.kind) {
      query.andWhere('log.kind = :kind', { kind: filter.kind });
    }
    if (filter.from) {
      query.andWhere('log.created_at >= :from', { from: filter.from });
    }
    if (filter.to) {
      query.andWhere('log.created_at <= :to', { to: filter.to });
    }

    const [rows, total] = await query
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .getManyAndCount();

    return { items: rows.map((row) => this.toDomain(row)), total };
  }

  private toDomain(row: AuditLogOrmEntity): AuditLog {
    return new AuditLog(
      row.id,
      row.actorId,
      row.actorEmail,
      row.actorRoles,
      row.method,
      row.route,
      row.resourceId,
      row.statusCode,
      row.success,
      row.kind,
      row.ipAddress,
      row.createdAt,
    );
  }
}
```

No hay test unitario para este repositorio (es una capa fina sobre TypeORM sin lógica propia más allá del query builder) — se verifica en Task 4 con el endpoint real corriendo contra la base de dev, mismo criterio que el resto de los repositorios TypeORM del proyecto (ninguno tiene `.spec.ts` propio; ver `typeorm-section.repository.ts`).

- [ ] **Step 7: Verificar que compila**

Run: `cd apps/api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/core/database/migrations/tenant/1700000000057-CreateAuditLogs.ts apps/api/src/modules/audit
git commit -m "feat(audit): agregar modelo de datos de logs de auditoría"
```

---

### Task 2: Casos de uso — registrar y listar

**Files:**
- Create: `apps/api/src/modules/audit/application/use-cases/record-audit-log.use-case.ts`
- Create: `apps/api/src/modules/audit/application/use-cases/record-audit-log.use-case.spec.ts`
- Create: `apps/api/src/modules/audit/application/use-cases/list-audit-logs.use-case.ts`
- Create: `apps/api/src/modules/audit/application/use-cases/list-audit-logs.use-case.spec.ts`

**Interfaces:**
- Consumes: `AuditLogRepositoryPort` (Task 1), `PaginationQueryDto`/`normalizePagination` de `core/http/pagination.ts`/`pagination.dto.ts`.
- Produces: `RecordAuditLogUseCase.execute(entry: RecordAuditLogEntry): Promise<void>`, `ListAuditLogsUseCase.execute(query: ListAuditLogsQuery): Promise<PaginatedResult<AuditLog>>` — usado por el interceptor (Task 3) y el controller (Task 4).

- [ ] **Step 1: Test de `RecordAuditLogUseCase`**

```typescript
// apps/api/src/modules/audit/application/use-cases/record-audit-log.use-case.spec.ts
import { RecordAuditLogUseCase } from './record-audit-log.use-case';
import { AuditLogRepositoryPort } from '../ports/audit-log.repository.port';

describe('RecordAuditLogUseCase', () => {
  const auditLogs: jest.Mocked<AuditLogRepositoryPort> = {
    record: jest.fn(),
    findAll: jest.fn(),
  };

  const useCase = new RecordAuditLogUseCase(auditLogs);

  beforeEach(() => jest.clearAllMocks());

  it('delega en el repositorio con la misma entrada', async () => {
    const entry = {
      actorId: 'user-1',
      actorEmail: 'admin@test.com',
      actorRoles: ['admin_institucion'],
      method: 'DELETE',
      route: '/academic/sections/sec-1',
      resourceId: 'sec-1',
      statusCode: 204,
      success: true,
      kind: 'write' as const,
      ipAddress: '127.0.0.1',
    };

    await useCase.execute(entry);

    expect(auditLogs.record).toHaveBeenCalledWith(entry);
  });
});
```

- [ ] **Step 2: Correr el test, verificar que falla**

Run: `cd apps/api && npx jest record-audit-log`
Expected: FAIL — `Cannot find module './record-audit-log.use-case'`.

- [ ] **Step 3: Implementar `RecordAuditLogUseCase`**

```typescript
// apps/api/src/modules/audit/application/use-cases/record-audit-log.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { AuditLogRepositoryPort, RecordAuditLogEntry } from '../ports/audit-log.repository.port';

@Injectable()
export class RecordAuditLogUseCase {
  constructor(@Inject(AuditLogRepositoryPort) private readonly auditLogs: AuditLogRepositoryPort) {}

  async execute(entry: RecordAuditLogEntry): Promise<void> {
    await this.auditLogs.record(entry);
  }
}
```

- [ ] **Step 4: Correr el test, verificar que pasa**

Run: `cd apps/api && npx jest record-audit-log`
Expected: PASS.

- [ ] **Step 5: Test de `ListAuditLogsUseCase`**

```typescript
// apps/api/src/modules/audit/application/use-cases/list-audit-logs.use-case.spec.ts
import { ListAuditLogsUseCase } from './list-audit-logs.use-case';
import { AuditLogRepositoryPort } from '../ports/audit-log.repository.port';
import { AuditLog } from '../../domain/entities/audit-log.entity';

describe('ListAuditLogsUseCase', () => {
  const auditLogs: jest.Mocked<AuditLogRepositoryPort> = {
    record: jest.fn(),
    findAll: jest.fn(),
  };

  const useCase = new ListAuditLogsUseCase(auditLogs);

  const entry = new AuditLog(
    'log-1',
    'user-1',
    'admin@test.com',
    ['admin_institucion'],
    'DELETE',
    '/academic/sections/sec-1',
    'sec-1',
    204,
    true,
    'write',
    '127.0.0.1',
    new Date('2026-09-05T10:00:00Z'),
  );

  beforeEach(() => jest.clearAllMocks());

  it('normaliza page/pageSize inválidos a los defaults seguros', async () => {
    auditLogs.findAll.mockResolvedValue({ items: [entry], total: 1 });

    const result = await useCase.execute({ page: -5, pageSize: 999 });

    expect(auditLogs.findAll).toHaveBeenCalledWith(
      { search: undefined, kind: undefined, from: undefined, to: undefined },
      { page: 1, pageSize: 25 },
    );
    expect(result).toEqual({ items: [entry], total: 1, page: 1, pageSize: 25 });
  });

  it('recorta el término de búsqueda antes de pasarlo al filtro', async () => {
    auditLogs.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, pageSize: 25, search: '  admin  ' });

    expect(auditLogs.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'admin' }),
      { page: 1, pageSize: 25 },
    );
  });
});
```

- [ ] **Step 6: Correr el test, verificar que falla**

Run: `cd apps/api && npx jest list-audit-logs`
Expected: FAIL — `Cannot find module './list-audit-logs.use-case'`.

- [ ] **Step 7: Implementar `ListAuditLogsUseCase`**

```typescript
// apps/api/src/modules/audit/application/use-cases/list-audit-logs.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { AuditLogRepositoryPort } from '../ports/audit-log.repository.port';
import { AuditLog, AuditLogKind } from '../../domain/entities/audit-log.entity';
import { PaginatedResult } from '../../../../core/http/pagination.dto';
import { normalizePagination } from '../../../../core/http/pagination';

export interface ListAuditLogsQuery {
  search?: string;
  kind?: AuditLogKind;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ListAuditLogsUseCase {
  constructor(@Inject(AuditLogRepositoryPort) private readonly auditLogs: AuditLogRepositoryPort) {}

  async execute(query: ListAuditLogsQuery): Promise<PaginatedResult<AuditLog>> {
    const { page, pageSize } = normalizePagination(query.page, query.pageSize);
    const { items, total } = await this.auditLogs.findAll(
      {
        search: query.search?.trim() || undefined,
        kind: query.kind,
        from: query.from,
        to: query.to,
      },
      { page, pageSize },
    );
    return { items, total, page, pageSize };
  }
}
```

- [ ] **Step 8: Correr los tests, verificar que pasan**

Run: `cd apps/api && npx jest audit`
Expected: PASS — 3 tests (`RecordAuditLogUseCase` + los 2 de `ListAuditLogsUseCase`).

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/audit/application/use-cases
git commit -m "feat(audit): agregar casos de uso para registrar y listar logs"
```

---

### Task 3: El interceptor y el decorador `@AuditRead()`

**Files:**
- Create: `apps/api/src/modules/audit/interface/decorators/audit-read.decorator.ts`
- Create: `apps/api/src/modules/audit/interface/audit.interceptor.ts`
- Create: `apps/api/src/modules/audit/interface/audit.interceptor.spec.ts`

**Interfaces:**
- Consumes: `RecordAuditLogUseCase` (Task 2), `Reflector` de `@nestjs/core`, `JwtPayload` de `core/auth/jwt-payload.interface`.
- Produces: `AuditInterceptor` (registrado como `APP_INTERCEPTOR` en Task 4), `AuditRead(predicate?: AuditReadPredicate)` decorador — usado en Task 5 sobre los endpoints de lectura sensible.

- [ ] **Step 1: El decorador**

```typescript
// apps/api/src/modules/audit/interface/decorators/audit-read.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';

export const AUDIT_READ_KEY = 'audit_read';

/** Decide si ESTA request GET puntual cuenta como lectura sensible a auditar. */
export type AuditReadPredicate = (request: Request) => boolean;

/**
 * Marca un endpoint GET para que `AuditInterceptor` lo registre como lectura
 * sensible. Sin argumento, siempre audita (ej. `GET /users`). Con un
 * predicado, audita solo cuando la condición se cumple (ej. `GET
 * /finance/charges` solo cuando la query trae `enrollmentId`) — mismo
 * mecanismo que `@CheckPolicies` (`SetMetadata` + `Reflector` en el
 * interceptor/guard).
 */
export const AuditRead = (predicate: AuditReadPredicate = () => true) =>
  SetMetadata(AUDIT_READ_KEY, predicate);
```

- [ ] **Step 2: Test del interceptor**

```typescript
// apps/api/src/modules/audit/interface/audit.interceptor.spec.ts
import { of, throwError } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditInterceptor } from './audit.interceptor';
import { RecordAuditLogUseCase } from '../application/use-cases/record-audit-log.use-case';

describe('AuditInterceptor', () => {
  let recordAuditLog: jest.Mocked<RecordAuditLogUseCase>;
  let reflector: jest.Mocked<Reflector>;
  let interceptor: AuditInterceptor;

  function buildContext(overrides: {
    method: string;
    url?: string;
    params?: Record<string, string>;
    user?: { sub: string; email: string; roles: string[] };
  }): ExecutionContext {
    const request = {
      method: overrides.method,
      originalUrl: overrides.url ?? '/test',
      params: overrides.params ?? {},
      query: {},
      ip: '127.0.0.1',
      user: overrides.user,
    };
    return {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({}) }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  function buildHandler(result: unknown, shouldThrow = false): CallHandler {
    return {
      handle: () => (shouldThrow ? throwError(() => result) : of(result)),
    };
  }

  beforeEach(() => {
    recordAuditLog = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<RecordAuditLogUseCase>;
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    interceptor = new AuditInterceptor(reflector, recordAuditLog);
  });

  it('loguea toda escritura (POST/PATCH/DELETE) sin necesidad de decorador', (done) => {
    const context = buildContext({
      method: 'DELETE',
      url: '/academic/sections/sec-1',
      params: { id: 'sec-1' },
      user: { sub: 'user-1', email: 'admin@test.com', roles: ['admin_institucion'] },
    });

    interceptor.intercept(context, buildHandler({ ok: true })).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            actorId: 'user-1',
            actorEmail: 'admin@test.com',
            method: 'DELETE',
            route: '/academic/sections/sec-1',
            resourceId: 'sec-1',
            kind: 'write',
            success: true,
          }),
        );
        done();
      });
    });
  });

  it('no loguea un GET sin decorador @AuditRead', (done) => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = buildContext({ method: 'GET', url: '/academic/sections' });

    interceptor.intercept(context, buildHandler([])).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it('loguea un GET con @AuditRead cuando el predicado da true', (done) => {
    reflector.getAllAndOverride.mockReturnValue(() => true);
    const context = buildContext({
      method: 'GET',
      url: '/users',
      user: { sub: 'user-1', email: 'admin@test.com', roles: ['admin_institucion'] },
    });

    interceptor.intercept(context, buildHandler([])).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).toHaveBeenCalledWith(
          expect.objectContaining({ method: 'GET', kind: 'sensitive_read' }),
        );
        done();
      });
    });
  });

  it('no loguea un GET con @AuditRead cuando el predicado da false', (done) => {
    reflector.getAllAndOverride.mockReturnValue(() => false);
    const context = buildContext({ method: 'GET', url: '/finance/charges' });

    interceptor.intercept(context, buildHandler([])).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it('registra el error y el status code cuando el handler falla, sin ocultar el error original', (done) => {
    const context = buildContext({ method: 'POST', url: '/enrollments' });
    const error = { message: 'boom', getStatus: () => 409 };

    interceptor.intercept(context, buildHandler(error, true)).subscribe({
      error: (thrown) => {
        setImmediate(() => {
          expect(thrown).toBe(error);
          expect(recordAuditLog.execute).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, statusCode: 409 }),
          );
          done();
        });
      },
    });
  });

  it('no rompe la respuesta si falla la escritura del log', (done) => {
    recordAuditLog.execute.mockRejectedValue(new Error('db down'));
    const context = buildContext({ method: 'DELETE', url: '/academic/sections/sec-1' });

    interceptor.intercept(context, buildHandler({ ok: true })).subscribe((value) => {
      expect(value).toEqual({ ok: true });
      done();
    });
  });
});
```

- [ ] **Step 3: Correr los tests, verificar que fallan**

Run: `cd apps/api && npx jest audit.interceptor`
Expected: FAIL — `Cannot find module './audit.interceptor'`.

- [ ] **Step 4: Implementar el interceptor**

```typescript
// apps/api/src/modules/audit/interface/audit.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { RecordAuditLogUseCase } from '../application/use-cases/record-audit-log.use-case';
import { RecordAuditLogEntry } from '../application/ports/audit-log.repository.port';
import { AUDIT_READ_KEY, AuditReadPredicate } from './decorators/audit-read.decorator';
import { JwtPayload } from '../../../core/auth/jwt-payload.interface';

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly recordAuditLog: RecordAuditLogUseCase,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    let kind: 'write' | 'sensitive_read' | null = WRITE_METHODS.has(method) ? 'write' : null;

    if (!kind) {
      const predicate = this.reflector.getAllAndOverride<AuditReadPredicate | undefined>(
        AUDIT_READ_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (predicate && predicate(request)) {
        kind = 'sensitive_read';
      }
    }

    if (!kind) {
      return next.handle();
    }

    const user = (request as Request & { user?: JwtPayload }).user;
    const base = {
      actorId: user?.sub ?? null,
      actorEmail: user?.email ?? null,
      actorRoles: user?.roles ?? null,
      method,
      route: request.originalUrl.split('?')[0],
      resourceId: request.params?.id ?? null,
      ipAddress: request.ip ?? null,
      kind,
    };

    return next.handle().pipe(
      tap(() => {
        // El status code real todavía no lo fijó Nest en este punto del
        // pipeline (lo hace después de que se resuelven los interceptors) —
        // para el camino exitoso no se intenta adivinar, solo se marca
        // `success: true` con `statusCode: null`. El camino de error sí
        // tiene un código confiable (viene de la excepción atrapada).
        this.persist({ ...base, statusCode: null, success: true });
      }),
      catchError((err) => {
        const statusCode = typeof err?.getStatus === 'function' ? err.getStatus() : 500;
        this.persist({ ...base, statusCode, success: false });
        return throwError(() => err);
      }),
    );
  }

  private persist(entry: RecordAuditLogEntry): void {
    this.recordAuditLog.execute(entry).catch((err: Error) => {
      this.logger.warn(`No se pudo registrar el log de auditoría: ${err.message}`);
    });
  }
}
```

- [ ] **Step 5: Correr los tests, verificar que pasan**

Run: `cd apps/api && npx jest audit.interceptor`
Expected: PASS — 6 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/audit/interface
git commit -m "feat(audit): agregar AuditInterceptor y decorador @AuditRead"
```

---

### Task 4: Módulo, controller, subject CASL y wiring en `AppModule`

**Files:**
- Create: `apps/api/src/modules/audit/interface/dtos/list-audit-logs-query.dto.ts`
- Create: `apps/api/src/modules/audit/interface/controllers/audit-logs.controller.ts`
- Create: `apps/api/src/modules/audit/audit.module.ts`
- Modify: `apps/api/src/core/auth/casl/ability.ts` — agregar `'AuditLog'` a `AppSubjects`
- Modify: `apps/api/src/app.module.ts` — importar `AuditModule`

**Interfaces:**
- Consumes: `ListAuditLogsUseCase`, `RecordAuditLogUseCase`, `TypeOrmAuditLogRepository` (Tasks 1-2), `AuditInterceptor` (Task 3).
- Produces: `GET /audit-logs` (endpoint real), disponible para el frontend (Task 6).

- [ ] **Step 1: DTO de query**

```typescript
// apps/api/src/modules/audit/interface/dtos/list-audit-logs-query.dto.ts
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../core/http/pagination.dto';
import { AuditLogKind } from '../../domain/entities/audit-log.entity';

const KNOWN_KINDS: AuditLogKind[] = ['write', 'sensitive_read'];

export class ListAuditLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(KNOWN_KINDS)
  kind?: AuditLogKind;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
```

- [ ] **Step 2: Agregar `'AuditLog'` al union de subjects**

En `apps/api/src/core/auth/casl/ability.ts`, agregar una línea al tipo `AppSubjects` (después de `'Admission'`):

```typescript
  | 'Admission'
  | 'AuditLog'
  | 'all';
```

No hace falta tocar `ability.factory.ts`: `admin_institucion` ya tiene `can('manage', 'all')`, que cubre cualquier subject nuevo — y como ningún otro rol lista `'AuditLog'` explícitamente, quedan excluidos por default (CASL deniega salvo regla explícita). Esto es lo que mantiene el log fuera del alcance de `directivo`.

- [ ] **Step 3: Controller**

```typescript
// apps/api/src/modules/audit/interface/controllers/audit-logs.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { ListAuditLogsUseCase } from '../../application/use-cases/list-audit-logs.use-case';
import { ListAuditLogsQueryDto } from '../dtos/list-audit-logs-query.dto';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly listAuditLogs: ListAuditLogsUseCase) {}

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'AuditLog'))
  async list(@Query() query: ListAuditLogsQueryDto) {
    return this.listAuditLogs.execute(query);
  }
}
```

- [ ] **Step 4: Módulo**

```typescript
// apps/api/src/modules/audit/audit.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogsController } from './interface/controllers/audit-logs.controller';
import { RecordAuditLogUseCase } from './application/use-cases/record-audit-log.use-case';
import { ListAuditLogsUseCase } from './application/use-cases/list-audit-logs.use-case';
import { AuditLogRepositoryPort } from './application/ports/audit-log.repository.port';
import { TypeOrmAuditLogRepository } from './infrastructure/repositories/typeorm-audit-log.repository';
import { AuditInterceptor } from './interface/audit.interceptor';

@Module({
  controllers: [AuditLogsController],
  providers: [
    RecordAuditLogUseCase,
    ListAuditLogsUseCase,
    { provide: AuditLogRepositoryPort, useClass: TypeOrmAuditLogRepository },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AuditModule {}
```

- [ ] **Step 5: Registrar el módulo en `AppModule`**

En `apps/api/src/app.module.ts`, agregar el import:

```typescript
import { AuditModule } from './modules/audit/audit.module';
```

Y agregarlo al array `imports` (después de `ReportsModule`):

```typescript
    ReportsModule,
    AuditModule,
```

- [ ] **Step 6: Verificar que compila y que la suite completa sigue en verde**

Run: `cd apps/api && npx tsc --noEmit`
Expected: sin errores.

Run: `cd apps/api && npx jest`
Expected: todos los tests existentes + los nuevos de `audit` en verde.

- [ ] **Step 7: Levantar la API y verificar el endpoint en vivo**

Arrancar la API (`npm run dev` en `apps/api`), loguearse como `admin@colegio-demo.test` / `Demo12345!` desde el frontend (o generar un token vía `/auth/login` con curl), y:
1. Ejecutar cualquier acción de escritura ya existente (ej. `DELETE /academic/sections/:id` sobre una sección sin matrículas activas, desde la UI de Secciones).
2. Golpear `GET /audit-logs` (con el mismo token) y confirmar que aparece una entrada con `method: "DELETE"`, `kind: "write"`, `actorEmail: "admin@colegio-demo.test"`.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/audit apps/api/src/core/auth/casl/ability.ts apps/api/src/app.module.ts
git commit -m "feat(audit): exponer GET /audit-logs y registrar el interceptor globalmente"
```

---

### Task 5: Marcar las dos lecturas sensibles

**Files:**
- Modify: `apps/api/src/modules/identity/interface/controllers/users.controller.ts`
- Modify: `apps/api/src/modules/finance/interface/controllers/charges.controller.ts`

**Interfaces:**
- Consumes: `AuditRead` decorador (Task 3).

- [ ] **Step 1: Marcar `GET /users`**

En `apps/api/src/modules/identity/interface/controllers/users.controller.ts`, importar el decorador:

```typescript
import { AuditRead } from '../../../audit/interface/decorators/audit-read.decorator';
```

Y agregarlo sobre el método `list` (sin predicado — siempre audita):

```typescript
  @Get()
  @CheckPolicies((ability) => ability.can('read', 'User'))
  @AuditRead()
  async list(@Query() query: ListUsersQueryDto) {
```

- [ ] **Step 2: Marcar `GET /finance/charges`**

En `apps/api/src/modules/finance/interface/controllers/charges.controller.ts`, importar el decorador:

```typescript
import { AuditRead } from '../../../audit/interface/decorators/audit-read.decorator';
```

Y agregarlo sobre el método `list`, con predicado (solo audita cuando la query trae `enrollmentId`):

```typescript
  @Get()
  @AuditRead((request) => !!request.query.enrollmentId)
  async list(@Query() query: ListChargesQueryDto, @CurrentUser() user: JwtPayload) {
```

- [ ] **Step 3: Verificar que compila**

Run: `cd apps/api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificar en vivo**

Con la API corriendo: hacer `GET /finance/charges` (sin `enrollmentId`) y confirmar que **no** aparece en `/audit-logs`; hacer `GET /finance/charges?enrollmentId=<uno real>` y confirmar que sí aparece con `kind: "sensitive_read"`. Hacer `GET /users` y confirmar que también aparece.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/interface/controllers/users.controller.ts apps/api/src/modules/finance/interface/controllers/charges.controller.ts
git commit -m "feat(audit): auditar el listado de usuarios y cargos por estudiante"
```

---

### Task 6: Tipo compartido, hook de datos y ruta BFF

**Files:**
- Modify: `packages/shared-types/src/index.ts` — agregar `AuditLog`, `AuditLogKind`
- Create: `apps/web/src/features/audit/use-audit-logs.ts`
- Create: `apps/web/src/app/api/audit-logs/route.ts`

**Interfaces:**
- Consumes: `PaginatedResult` (ya existe en shared-types), `serverApiFetch` de `@/lib/server-api`.
- Produces: `useAuditLogs(filter): UseQueryResult<PaginatedResult<AuditLog>>` — usado por el componente de lista (Task 7).

- [ ] **Step 1: Tipo compartido**

En `packages/shared-types/src/index.ts`, agregar (después de la interfaz `Enrollment`, junto a `EnrollmentStatus` — mismo lugar temático):

```typescript
export type AuditLogKind = 'write' | 'sensitive_read';

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRoles: string[] | null;
  method: string;
  route: string;
  resourceId: string | null;
  statusCode: number | null;
  success: boolean;
  kind: AuditLogKind;
  ipAddress: string | null;
  createdAt: string;
}
```

- [ ] **Step 2: Ruta BFF**

```typescript
// apps/web/src/app/api/audit-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AuditLog, PaginatedResult } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/audit-logs?${qs}` : '/audit-logs';
  const result = await serverApiFetch<PaginatedResult<AuditLog>>(path);
  if (result === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Hook**

```typescript
// apps/web/src/features/audit/use-audit-logs.ts
'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { AuditLog, AuditLogKind, PaginatedResult } from '@eduapp/shared-types';

export interface AuditLogsFilter {
  search?: string;
  kind?: AuditLogKind;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

async function fetchAuditLogs(filter: AuditLogsFilter): Promise<PaginatedResult<AuditLog>> {
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  if (filter.kind) params.set('kind', filter.kind);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  params.set('page', String(filter.page));
  params.set('pageSize', String(filter.pageSize));

  const res = await fetch(`/api/audit-logs?${params.toString()}`);
  if (!res.ok) throw new Error('No se pudieron cargar los logs de auditoría');
  return res.json();
}

export function useAuditLogs(filter: AuditLogsFilter) {
  return useQuery({
    queryKey: ['audit-logs', filter],
    queryFn: () => fetchAuditLogs(filter),
    // Mismo motivo que en Usuarios/Matrícula: cada página/búsqueda distinta
    // es una query-key nueva, así que sin esto el buscador pierde foco en
    // cada tecla.
    placeholderData: keepPreviousData,
  });
}
```

- [ ] **Step 4: Verificar que compila**

Run: `cd apps/web && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/index.ts apps/web/src/features/audit apps/web/src/app/api/audit-logs
git commit -m "feat(audit): agregar tipo compartido, hook y ruta BFF del frontend"
```

---

### Task 7: Pantalla de auditoría — lista, página, nav y permisos

**Files:**
- Modify: `apps/web/src/lib/permissions.ts` — agregar `canViewAuditLogs`
- Modify: `apps/web/src/lib/nav-config.ts` — agregar el link `/audit`
- Create: `apps/web/src/features/audit/components/audit-logs-list.tsx`
- Create: `apps/web/src/app/(dashboard)/audit/page.tsx`

**Interfaces:**
- Consumes: `useAuditLogs` (Task 6), `Pagination`/`Input`/`Card`/`LoadingState` de `@/components/ui/*` (ya existentes), `getCurrentUser` de `@/lib/server-api`.

- [ ] **Step 1: Permiso**

En `apps/web/src/lib/permissions.ts`, agregar (junto a `canEditUsers`, mismo criterio):

```typescript
/**
 * Solo admin_institucion — ni siquiera directivo — puede ver el log de
 * auditoría: pierde el sentido si el rol que más acciones ejecuta también
 * es el único que revisa el rastro. Ver `AuditLogsController` en el
 * backend, mismo criterio (el subject CASL `'AuditLog'` no se le da a
 * `directivo`).
 */
export function canViewAuditLogs(roles: string[]): boolean {
  return roles.includes('admin_institucion');
}
```

- [ ] **Step 2: Nav link**

En `apps/web/src/lib/nav-config.ts`:
- Importar el ícono `ScrollText` desde `lucide-react` (agregarlo a la lista de imports existente).
- Agregar al array `links` del grupo `'administracion'` (después de `/users`):

```typescript
      { href: '/audit', label: 'Auditoría', icon: ScrollText, roles: ['admin_institucion'] },
```

- [ ] **Step 3: Componente de lista**

```typescript
// apps/web/src/features/audit/components/audit-logs-list.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuditLogs } from '../use-audit-logs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Pagination } from '@/components/ui/pagination';
import type { AuditLog } from '@eduapp/shared-types';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Traduce método+ruta a una descripción legible — se amplía con el tiempo
 * sin tocar el interceptor del backend. Cualquier ruta sin match acá cae al
 * fallback genérico (`method` + `route`), nunca queda en blanco.
 */
const ROUTE_LABELS: { pattern: RegExp; label: (m: RegExpMatchArray) => string }[] = [
  { pattern: /^DELETE \/academic\/sections\//, label: () => 'Eliminó una sección' },
  { pattern: /^PATCH \/academic\/sections\//, label: () => 'Editó una sección' },
  { pattern: /^DELETE \/academic\/grades\//, label: () => 'Eliminó un grado' },
  { pattern: /^PATCH \/academic\/grades\//, label: () => 'Editó un grado' },
  { pattern: /^DELETE \/academic\/years\//, label: () => 'Eliminó un año lectivo' },
  { pattern: /^PATCH \/academic\/years\//, label: () => 'Editó un año lectivo' },
  { pattern: /^PATCH \/users\/[^/]+\/deactivate/, label: () => 'Inactivó un usuario' },
  { pattern: /^PATCH \/users\/[^/]+\/reactivate/, label: () => 'Reactivó un usuario' },
  { pattern: /^PATCH \/users\//, label: () => 'Editó un usuario' },
  { pattern: /^PATCH \/enrollments\/[^/]+\/withdraw/, label: () => 'Dio de baja una matrícula' },
  { pattern: /^PATCH \/enrollments\/[^/]+\/reassign-section/, label: () => 'Reubicó una matrícula' },
  { pattern: /^POST \/enrollments/, label: () => 'Matriculó un estudiante' },
  { pattern: /^GET \/users/, label: () => 'Consultó el listado de usuarios' },
  { pattern: /^GET \/finance\/charges/, label: () => 'Consultó cargos de un estudiante' },
];

function describeAction(log: AuditLog): string {
  const key = `${log.method} ${log.route}`;
  for (const entry of ROUTE_LABELS) {
    const match = key.match(entry.pattern);
    if (match) return entry.label(match);
  }
  return key;
}

export function AuditLogsList() {
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const timeout = setTimeout(() => setCommittedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [committedSearch, pageSize]);

  const { data, isLoading, error } = useAuditLogs({
    page,
    pageSize,
    search: committedSearch || undefined,
  });
  const logs = data?.items;

  const filters = (
    <Input
      placeholder="Buscar por email del actor o ruta..."
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      className="w-72"
    />
  );

  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <div className="space-y-3">
        {filters}
        <p className="text-sm text-destructive">No se pudieron cargar los logs.</p>
      </div>
    );
  }
  if (!logs || logs.length === 0) {
    return (
      <div className="space-y-3">
        {filters}
        <p className="text-sm text-muted-foreground">
          {committedSearch ? 'No hay logs que coincidan con la búsqueda.' : 'Todavía no hay logs.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filters}
      <ul className="space-y-2">
        {logs.map((log) => (
          <Card key={log.id} className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{describeAction(log)}</p>
                <p className="text-sm text-muted-foreground">
                  {log.actorEmail ?? 'Anónimo'}
                  {log.actorRoles?.length ? ` (${log.actorRoles.join(', ')})` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    log.success ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {log.success ? 'Éxito' : 'Error'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </ul>
      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Página**

```typescript
// apps/web/src/app/(dashboard)/audit/page.tsx
import { redirect } from 'next/navigation';
import { AuditLogsList } from '@/features/audit/components/audit-logs-list';
import { getCurrentUser } from '@/lib/server-api';
import { canViewAuditLogs } from '@/lib/permissions';

export default async function AuditPage() {
  const user = await getCurrentUser();
  if (!canViewAuditLogs(user?.roles ?? [])) {
    redirect('/dashboard');
  }

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro de acciones ejecutadas por usuarios de la institución.
        </p>
      </div>
      <AuditLogsList />
    </main>
  );
}
```

- [ ] **Step 5: Verificar que compila**

Run: `cd apps/web && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Verificación end-to-end en el navegador**

Con ambas apps corriendo (API + web):
1. Loguearse como `admin@colegio-demo.test` / `Demo12345!`.
2. Ir a "Secciones", eliminar cualquier sección sin matrículas activas (o crear una de prueba y eliminarla).
3. Ir a "Auditoría" (nuevo link en el sidebar, grupo "Administración") y confirmar que aparece una entrada "Eliminó una sección", con el email del admin y timestamp reciente.
4. Ir a "Usuarios", confirmar que cargar esa pantalla genera una entrada "Consultó el listado de usuarios" en Auditoría.
5. Probar el buscador (escribir el email del admin) y confirmar que no pierde el foco en cada tecla (mismo chequeo que ya se hizo en Usuarios/Matrícula).
6. Loguearse como un usuario con rol `directivo` (si existe uno de prueba) y confirmar que `/audit` redirige a `/dashboard` — no debería poder ver el log.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/permissions.ts apps/web/src/lib/nav-config.ts apps/web/src/features/audit/components apps/web/src/app/"(dashboard)"/audit
git commit -m "feat(audit): agregar la pantalla de auditoría al frontend"
```

---

## Spec Coverage Checklist

- Modelo de datos con snapshot de actor → Task 1.
- Interceptor global para escrituras → Task 3.
- `@AuditRead()` para lecturas sensibles → Task 3 + Task 5.
- Finanzas solo audita con `enrollmentId` → Task 5.
- Usuarios audita cada carga del listado → Task 5.
- Subject CASL `'AuditLog'` solo para `admin_institucion` → Task 4.
- Un fallo al escribir el log no rompe la request → Task 3 (test + implementación).
- Pantalla `/audit` con buscador+paginación, mismo patrón que Usuarios/Matrícula → Task 7.
- Traducción de rutas a descripciones legibles, ampliable → Task 7.
- Verificación end-to-end real → Task 4 (backend), Task 5 (lecturas sensibles), Task 7 (frontend completo).
