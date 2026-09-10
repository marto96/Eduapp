# Auditoría cross-tenant desde el panel de superadmin — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un superadmin pueda, desde una página propia dentro del detalle de un tenant, ver y filtrar el audit log de ese tenant y exportarlo a CSV — sin tener que impersonar a nadie primero.

**Architecture:** Mismo patrón que gestión de usuarios por tenant: dos use-cases nuevos que, dado un `tenantId`, resuelven su `schemaName`, abren una conexión puntual a ese schema, e instancian a mano el `TypeOrmAuditLogRepository` para delegar en el `ListAuditLogsUseCase` **ya existente** (el mismo que usa el tenant para sí mismo) — cero lógica de filtrado/paginación nueva. La exportación bypassea ese use-case (que limita `pageSize` a 100 para pantalla) y llama directo al repositorio con un tope de 10.000 filas, devolviendo un CSV armado en el servidor.

**Tech Stack:** NestJS (hexagonal), TypeORM, Next.js App Router + React Query. Sin framework de test en `apps/web` — verificación manual en navegador para el frontend.

**Spec:** [docs/superpowers/specs/2026-09-10-cross-tenant-audit-design.md](../specs/2026-09-10-cross-tenant-audit-design.md)

## Global Constraints

- Solo lectura — nunca se borra ni modifica un registro de auditoría desde este flujo.
- **Ninguna de las dos acciones (ver, exportar) genera una entrada nueva en `audit_logs`** — `recordPlatformAudit` no se toca ni se llama desde ninguno de los dos use-cases nuevos. `audit_logs` sigue guardando solo lo que ya guarda hoy (escrituras y errores).
- Los 2 use-cases nuevos **no reciben `platformAdmin`** — mismo criterio que `PlatformListTenantUsersUseCase`, que tampoco lo recibe porque las lecturas no auditan nada.
- `ListAuditLogsUseCase` (existente) se reutiliza tal cual para la vista paginada — nunca se duplica su lógica de filtrado.
- La exportación tiene un tope de seguridad de **10.000 filas** — si el filtro trae más, se exportan las primeras 10.000 (mismo orden que la vista: `created_at DESC`).
- No se agregan filtros de tipo o rango de fecha en la UI (ni en la vista nueva ni en la del tenant) — el backend ya los soporta, se mantiene la misma paridad que hoy tiene el frontend del tenant (solo búsqueda).
- `impersonatedBy` se muestra como badge únicamente en la vista nueva del superadmin — la vista de auditoría del propio tenant no se toca.
- La conexión puntual al schema del tenant siempre se cierra en un `finally` (ya garantizado por `withTenantSchemaConnection`, no hay nada nuevo que hacer acá).

---

## Task 1: Use-cases de plataforma — listar y exportar auditoría de un tenant

**Files:**
- Create: `apps/api/src/modules/platform/application/use-cases/platform-list-tenant-audit-logs.use-case.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-list-tenant-audit-logs.use-case.spec.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-export-tenant-audit-logs.use-case.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-export-tenant-audit-logs.use-case.spec.ts`

**Interfaces:**
- Consumes: `TenantRepositoryPort.findById` (existente); `withTenantSchemaConnection` (existente); `TypeOrmAuditLogRepository` (existente, `apps/api/src/modules/audit/infrastructure/repositories/typeorm-audit-log.repository.ts` — mismo patrón de instanciación manual ya usado con `TypeOrmUserRepository`); `ListAuditLogsUseCase`/`ListAuditLogsQuery` (existentes, `apps/api/src/modules/audit/application/use-cases/list-audit-logs.use-case.ts`); `AuditLogFilter` (existente, `apps/api/src/modules/audit/application/ports/audit-log.repository.port.ts`).
- Produces: `PlatformListTenantAuditLogsUseCase.execute(tenantId, query): Promise<PaginatedResult<AuditLog>>`, `PlatformExportTenantAuditLogsUseCase.execute(tenantId, filter): Promise<string>` (el CSV como texto) — usados por la Task 2.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `apps/api/src/modules/platform/application/use-cases/platform-list-tenant-audit-logs.use-case.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { PlatformListTenantAuditLogsUseCase } from './platform-list-tenant-audit-logs.use-case';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { AuditLog } from '../../../audit/domain/entities/audit-log.entity';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmAuditLogRepository } from '../../../audit/infrastructure/repositories/typeorm-audit-log.repository';

jest.mock('../../infrastructure/tenant-schema-connection');
jest.mock('../../../audit/infrastructure/repositories/typeorm-audit-log.repository');

describe('PlatformListTenantAuditLogsUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };
  const useCase = new PlatformListTenantAuditLogsUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const fakeLog = new AuditLog(
    'log-1', 'user-1', 'admin@santateresa.test', ['admin_institucion'],
    'PATCH', '/users/user-2', 'user-2', 200, true, 'write', '127.0.0.1',
    new Date('2026-09-10T10:00:00Z'), null,
  );
  const fakeAuditLogRepo = { record: jest.fn(), findAll: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmAuditLogRepository as jest.Mock).mockImplementation(() => fakeAuditLogRepo);
    fakeAuditLogRepo.findAll.mockResolvedValue({ items: [fakeLog], total: 1 });
  });

  it('rechaza si el tenant no existe, sin intentar abrir ninguna conexión', async () => {
    tenants.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant-x', {})).rejects.toThrow(NotFoundException);
    expect(withTenantSchemaConnection).not.toHaveBeenCalled();
  });

  it('delega en ListAuditLogsUseCase contra el schema del tenant elegido', async () => {
    const result = await useCase.execute('tenant-1', { search: 'admin', page: 1, pageSize: 25 });

    expect(withTenantSchemaConnection).toHaveBeenCalledWith('tenant_santateresa', expect.any(Function));
    expect(fakeAuditLogRepo.findAll).toHaveBeenCalledWith(
      { search: 'admin', kind: undefined, from: undefined, to: undefined },
      { page: 1, pageSize: 25 },
    );
    expect(result).toEqual({ items: [fakeLog], total: 1, page: 1, pageSize: 25 });
  });
});
```

Crear `apps/api/src/modules/platform/application/use-cases/platform-export-tenant-audit-logs.use-case.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { PlatformExportTenantAuditLogsUseCase } from './platform-export-tenant-audit-logs.use-case';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { AuditLog } from '../../../audit/domain/entities/audit-log.entity';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmAuditLogRepository } from '../../../audit/infrastructure/repositories/typeorm-audit-log.repository';

jest.mock('../../infrastructure/tenant-schema-connection');
jest.mock('../../../audit/infrastructure/repositories/typeorm-audit-log.repository');

describe('PlatformExportTenantAuditLogsUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };
  const useCase = new PlatformExportTenantAuditLogsUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const fakeLog = new AuditLog(
    'log-1', 'user-1', 'admin@santateresa.test', ['admin_institucion'],
    'PATCH', '/users/user-2', 'user-2', 200, true, 'write', '127.0.0.1',
    new Date('2026-09-10T10:00:00.000Z'), 'admin-9',
  );
  const fakeAuditLogRepo = { record: jest.fn(), findAll: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmAuditLogRepository as jest.Mock).mockImplementation(() => fakeAuditLogRepo);
    fakeAuditLogRepo.findAll.mockResolvedValue({ items: [fakeLog], total: 1 });
  });

  it('rechaza si el tenant no existe, sin intentar abrir ninguna conexión', async () => {
    tenants.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant-x', {})).rejects.toThrow(NotFoundException);
    expect(withTenantSchemaConnection).not.toHaveBeenCalled();
  });

  it('pide hasta 10.000 filas de una sola vez, sin pasar por la paginación de pantalla', async () => {
    await useCase.execute('tenant-1', { search: 'admin' });

    expect(fakeAuditLogRepo.findAll).toHaveBeenCalledWith({ search: 'admin' }, { page: 1, pageSize: 10_000 });
  });

  it('arma el CSV con encabezado y una fila por log, sin registrar ninguna auditoría', async () => {
    const csv = await useCase.execute('tenant-1', {});

    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'fecha,actor_email,actor_roles,metodo,ruta,recurso_id,codigo_estado,exito,tipo,ip,via_impersonacion',
    );
    expect(lines[1]).toBe(
      '2026-09-10T10:00:00.000Z,admin@santateresa.test,admin_institucion,PATCH,/users/user-2,user-2,200,si,write,127.0.0.1,admin-9',
    );
    expect(fakeAuditLogRepo.record).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd apps/api && npx jest platform-list-tenant-audit-logs.use-case.spec.ts platform-export-tenant-audit-logs.use-case.spec.ts`
Expected: FAIL — los módulos no existen.

- [ ] **Step 3: Implementar `PlatformListTenantAuditLogsUseCase`**

Crear `apps/api/src/modules/platform/application/use-cases/platform-list-tenant-audit-logs.use-case.ts`:

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmAuditLogRepository } from '../../../audit/infrastructure/repositories/typeorm-audit-log.repository';
import {
  ListAuditLogsUseCase,
  ListAuditLogsQuery,
} from '../../../audit/application/use-cases/list-audit-logs.use-case';
import { AuditLog } from '../../../audit/domain/entities/audit-log.entity';
import { PaginatedResult } from '../../../../core/http/pagination.dto';

@Injectable()
export class PlatformListTenantAuditLogsUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(tenantId: string, query: ListAuditLogsQuery): Promise<PaginatedResult<AuditLog>> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const auditLogs = new TypeOrmAuditLogRepository(dataSource);
      return new ListAuditLogsUseCase(auditLogs).execute(query);
    });
  }
}
```

- [ ] **Step 4: Implementar `PlatformExportTenantAuditLogsUseCase`**

Crear `apps/api/src/modules/platform/application/use-cases/platform-export-tenant-audit-logs.use-case.ts`:

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmAuditLogRepository } from '../../../audit/infrastructure/repositories/typeorm-audit-log.repository';
import { AuditLog } from '../../../audit/domain/entities/audit-log.entity';
import { AuditLogFilter } from '../../../audit/application/ports/audit-log.repository.port';

/**
 * Tope de seguridad para exportar — no hay streaming ni paginación en la
 * exportación misma. Si un tenant supera esto de forma rutinaria, se
 * revisita (ver spec, sección "No-objetivos").
 */
const EXPORT_MAX_ROWS = 10_000;

@Injectable()
export class PlatformExportTenantAuditLogsUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(tenantId: string, filter: AuditLogFilter): Promise<string> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const auditLogs = new TypeOrmAuditLogRepository(dataSource);
      const { items } = await auditLogs.findAll(filter, { page: 1, pageSize: EXPORT_MAX_ROWS });
      return toCsv(items);
    });
  }
}

function toCsv(logs: AuditLog[]): string {
  const header = 'fecha,actor_email,actor_roles,metodo,ruta,recurso_id,codigo_estado,exito,tipo,ip,via_impersonacion';
  const rows = logs.map((log) =>
    [
      log.createdAt.toISOString(),
      log.actorEmail ?? '',
      (log.actorRoles ?? []).join('|'),
      log.method,
      log.route,
      log.resourceId ?? '',
      log.statusCode ?? '',
      log.success ? 'si' : 'no',
      log.kind,
      log.ipAddress ?? '',
      log.impersonatedBy ?? '',
    ]
      .map(escapeCsvField)
      .join(','),
  );
  return [header, ...rows].join('\n');
}

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `cd apps/api && npx jest platform-list-tenant-audit-logs.use-case.spec.ts platform-export-tenant-audit-logs.use-case.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/platform/application/use-cases/platform-list-tenant-audit-logs.use-case.ts \
  apps/api/src/modules/platform/application/use-cases/platform-list-tenant-audit-logs.use-case.spec.ts \
  apps/api/src/modules/platform/application/use-cases/platform-export-tenant-audit-logs.use-case.ts \
  apps/api/src/modules/platform/application/use-cases/platform-export-tenant-audit-logs.use-case.spec.ts
git commit -m "feat(platform): agregar use-cases de auditoría cross-tenant (listar y exportar)"
```

---

## Task 2: Controlador y wiring del módulo

**Files:**
- Create: `apps/api/src/modules/platform/interface/controllers/platform-tenant-audit.controller.ts`
- Modify: `apps/api/src/modules/platform/platform.module.ts`

**Interfaces:**
- Consumes: los 2 use-cases de la Task 1; `ListAuditLogsQueryDto` de `apps/api/src/modules/audit/interface/dtos/list-audit-logs-query.dto.ts` (existente, reusado tal cual).
- Produces: rutas HTTP `GET /platform/tenants/:tenantId/audit-logs` y `GET /platform/tenants/:tenantId/audit-logs/export` — usadas por la Task 3.

- [ ] **Step 1: Crear el controlador**

Crear `apps/api/src/modules/platform/interface/controllers/platform-tenant-audit.controller.ts`:

```ts
import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../../../core/auth/public.decorator';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { PlatformListTenantAuditLogsUseCase } from '../../application/use-cases/platform-list-tenant-audit-logs.use-case';
import { PlatformExportTenantAuditLogsUseCase } from '../../application/use-cases/platform-export-tenant-audit-logs.use-case';
import { ListAuditLogsQueryDto } from '../../../audit/interface/dtos/list-audit-logs-query.dto';

@Controller('platform/tenants/:tenantId/audit-logs')
@Public()
@UseGuards(PlatformAdminGuard)
export class PlatformTenantAuditController {
  constructor(
    private readonly listAuditLogs: PlatformListTenantAuditLogsUseCase,
    private readonly exportAuditLogs: PlatformExportTenantAuditLogsUseCase,
  ) {}

  @Get()
  async list(@Param('tenantId') tenantId: string, @Query() query: ListAuditLogsQueryDto) {
    return this.listAuditLogs.execute(tenantId, query);
  }

  @Get('export')
  async export(
    @Param('tenantId') tenantId: string,
    @Query() query: ListAuditLogsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.exportAuditLogs.execute(tenantId, {
      search: query.search,
      kind: query.kind,
      from: query.from,
      to: query.to,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="auditoria.csv"');
    res.send(csv);
  }
}
```

- [ ] **Step 2: Registrar todo en `platform.module.ts`**

Agregar los imports (junto a los demás controladores/use-cases de plataforma):

```ts
import { PlatformTenantAuditController } from './interface/controllers/platform-tenant-audit.controller';
import { PlatformListTenantAuditLogsUseCase } from './application/use-cases/platform-list-tenant-audit-logs.use-case';
import { PlatformExportTenantAuditLogsUseCase } from './application/use-cases/platform-export-tenant-audit-logs.use-case';
```

Agregar `PlatformTenantAuditController` al array `controllers` (junto a `PlatformTenantUsersController`), y los 2 use-cases al array `providers` (junto a `PlatformImpersonateTenantUserUseCase`).

- [ ] **Step 3: Verificar que compila**

Run: `cd apps/api && npm run build`
Expected: compila sin errores.

- [ ] **Step 4: Correr toda la suite de backend**

Run: `cd apps/api && npm test`
Expected: PASS, sin regresiones.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/platform/interface/controllers/platform-tenant-audit.controller.ts \
  apps/api/src/modules/platform/platform.module.ts
git commit -m "feat(platform): agregar endpoints de auditoría cross-tenant"
```

---

## Task 3: Frontend — shared-types, hook, y rutas BFF

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify: `apps/web/src/features/audit/components/audit-logs-list.tsx`
- Create: `apps/web/src/features/platform-tenant-audit/use-platform-tenant-audit-logs.ts`
- Create: `apps/web/src/app/api/platform/tenants/[id]/audit-logs/route.ts`
- Create: `apps/web/src/app/api/platform/tenants/[id]/audit-logs/export/route.ts`

**Interfaces:**
- Consumes: `platformApiFetch` (existente, `lib/platform-api.ts`); `GET /platform/tenants/:tenantId/audit-logs` y `/export` (Task 2); `describeAction` (existente, se exporta en este task).
- Produces: `usePlatformTenantAuditLogs`, `buildExportUrl` — usados por la Task 4. `AuditLog.impersonatedBy: string | null` — usado por la Task 4. `describeAction` exportado — usado por la Task 4.

- [ ] **Step 1: Extender `AuditLog` en shared-types**

En `packages/shared-types/src/index.ts`, reemplazar la interfaz `AuditLog` (línea 112-125):

```ts
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
  impersonatedBy: string | null;
}
```

- [ ] **Step 2: Exportar `describeAction` para reusarlo del lado de plataforma**

En `apps/web/src/features/audit/components/audit-logs-list.tsx`, agregar `export` a la función (línea 36):

```ts
export function describeAction(log: AuditLog): string {
```

(Es una función pura sin estado — no depende de nada específico del tenant, así que reusarla directo evita mantener dos copias de `ROUTE_LABELS` sincronizadas.)

- [ ] **Step 3: Rutas BFF**

Crear `apps/web/src/app/api/platform/tenants/[id]/audit-logs/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';
import type { AuditLog, PaginatedResult } from '@eduapp/shared-types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const qs = req.nextUrl.searchParams.toString();
  const path = `/platform/tenants/${params.id}/audit-logs${qs ? `?${qs}` : ''}`;
  const result = await platformApiFetch<PaginatedResult<AuditLog>>(path);
  if (result === null) {
    return NextResponse.json({ message: 'No se pudieron cargar los logs de auditoría' }, { status: 401 });
  }
  return NextResponse.json(result);
}
```

Crear `apps/web/src/app/api/platform/tenants/[id]/audit-logs/export/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * No usa `platformApiFetch`/`platformApiFetchWithStatus` — ambos asumen
 * una respuesta JSON. Esta ruta reenvía el CSV (`text/csv`) tal cual,
 * incluyendo el header que dispara la descarga en el navegador.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('platform_access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const qs = req.nextUrl.searchParams.toString();
  const apiRes = await fetch(
    `${API_URL}/platform/tenants/${params.id}/audit-logs/export${qs ? `?${qs}` : ''}`,
    { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' },
  );

  if (!apiRes.ok) {
    return NextResponse.json({ message: 'No se pudo exportar la auditoría' }, { status: apiRes.status });
  }

  const csv = await apiRes.text();
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="auditoria.csv"',
    },
  });
}
```

- [ ] **Step 4: Hook y helper de URL de exportación**

Crear `apps/web/src/features/platform-tenant-audit/use-platform-tenant-audit-logs.ts`:

```ts
'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { AuditLog, PaginatedResult } from '@eduapp/shared-types';

export interface PlatformTenantAuditLogsFilter {
  tenantId: string;
  search?: string;
  page: number;
  pageSize: number;
}

async function fetchPlatformTenantAuditLogs(
  filter: PlatformTenantAuditLogsFilter,
): Promise<PaginatedResult<AuditLog>> {
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  params.set('page', String(filter.page));
  params.set('pageSize', String(filter.pageSize));

  const res = await fetch(`/api/platform/tenants/${filter.tenantId}/audit-logs?${params.toString()}`);
  if (!res.ok) throw new Error('No se pudieron cargar los logs de auditoría');
  return res.json();
}

export function usePlatformTenantAuditLogs(filter: PlatformTenantAuditLogsFilter) {
  return useQuery({
    queryKey: ['platform-tenant-audit-logs', filter],
    queryFn: () => fetchPlatformTenantAuditLogs(filter),
    placeholderData: keepPreviousData,
  });
}

/** URL para el link "Exportar CSV" — el navegador la descarga directo por el header `Content-Disposition`. */
export function buildExportUrl(tenantId: string, search?: string): string {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const qs = params.toString();
  return `/api/platform/tenants/${tenantId}/audit-logs/export${qs ? `?${qs}` : ''}`;
}
```

- [ ] **Step 5: Verificar que el frontend compila**

Run: `cd apps/web && npm run build`
Expected: compila sin errores.

- [ ] **Step 6: Commit**

```bash
git add packages/shared-types/src/index.ts \
  apps/web/src/features/audit/components/audit-logs-list.tsx \
  apps/web/src/features/platform-tenant-audit/use-platform-tenant-audit-logs.ts \
  apps/web/src/app/api/platform/tenants/\[id\]/audit-logs/
git commit -m "feat(platform): agregar hooks y rutas BFF de auditoría cross-tenant"
```

---

## Task 4: Frontend — página de auditoría y verificación final

**Files:**
- Create: `apps/web/src/features/platform-tenant-audit/components/platform-tenant-audit-logs-list.tsx`
- Create: `apps/web/src/app/platform/tenants/[id]/audit/page.tsx`
- Modify: `apps/web/src/app/platform/tenants/[id]/page.tsx`

**Interfaces:**
- Consumes: `usePlatformTenantAuditLogs`, `buildExportUrl` (Task 3); `describeAction` (Task 3); `AuditLog.impersonatedBy` (Task 3); componentes UI existentes (`Card`, `Input`, `Label`, `Button`, `Pagination`, `LoadingState`).

- [ ] **Step 1: Componente de la lista con badge de impersonación y exportar**

Crear `apps/web/src/features/platform-tenant-audit/components/platform-tenant-audit-logs-list.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { usePlatformTenantAuditLogs, buildExportUrl } from '../use-platform-tenant-audit-logs';
import { describeAction } from '@/features/audit/components/audit-logs-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 350;

export function PlatformTenantAuditLogsList({ tenantId }: { tenantId: string }) {
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

  const { data, isLoading, error } = usePlatformTenantAuditLogs({
    tenantId,
    page,
    pageSize,
    search: committedSearch || undefined,
  });
  const logs = data?.items;

  const header = (
    <div className="flex items-center justify-between gap-3">
      <Input
        placeholder="Buscar por email del actor o ruta..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-72"
      />
      <a href={buildExportUrl(tenantId, committedSearch || undefined)} download>
        <Button type="button" variant="secondary">
          <Download className="mr-1.5 h-4 w-4" />
          Exportar CSV
        </Button>
      </a>
    </div>
  );

  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <div className="space-y-3">
        {header}
        <p className="text-sm text-destructive">No se pudieron cargar los logs.</p>
      </div>
    );
  }
  if (!logs || logs.length === 0) {
    return (
      <div className="space-y-3">
        {header}
        <p className="text-sm text-muted-foreground">
          {committedSearch ? 'No hay logs que coincidan con la búsqueda.' : 'Todavía no hay logs.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {header}
      <ul className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
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
                {log.impersonatedBy && (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600">
                    Vía impersonación
                  </span>
                )}
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

- [ ] **Step 2: Página de auditoría**

Crear `apps/web/src/app/platform/tenants/[id]/audit/page.tsx`:

```tsx
import { PlatformTenantAuditLogsList } from '@/features/platform-tenant-audit/components/platform-tenant-audit-logs-list';

export default function PlatformTenantAuditPage({ params }: { params: { id: string } }) {
  return (
    <main className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro de acciones de esta institución — solo lectura.
        </p>
      </div>
      <PlatformTenantAuditLogsList tenantId={params.id} />
    </main>
  );
}
```

- [ ] **Step 3: Link "Ver auditoría" en la página principal del tenant**

Reemplazar el contenido completo de `apps/web/src/app/platform/tenants/[id]/page.tsx`:

```tsx
import Link from 'next/link';
import { LogoUploadForm } from '@/features/platform-tenants/components/logo-upload-form';
import { PlatformTenantUsersList } from '@/features/platform-tenant-users/components/platform-tenant-users-list';
import { Button } from '@/components/ui/button';

export default function EditPlatformTenantPage({ params }: { params: { id: string } }) {
  return (
    <main className="space-y-8 p-6">
      <div className="flex justify-end">
        <Link href={`/platform/tenants/${params.id}/audit`}>
          <Button variant="secondary">Ver auditoría</Button>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Logo</h2>
        <LogoUploadForm tenantId={params.id} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Crear, editar, desactivar/reactivar y resetear contraseñas de usuarios de esta institución.
          </p>
        </div>
        <PlatformTenantUsersList tenantId={params.id} />
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Verificar que el frontend compila**

Run: `cd apps/web && npm run build`
Expected: compila sin errores.

- [ ] **Step 5: Correr toda la suite de backend una última vez**

Run: `cd apps/api && npm test`
Expected: PASS, sin regresiones.

- [ ] **Step 6: Verificar a mano en el navegador**

Con el stack corriendo, loguearse en `/platform/login` como superadmin, entrar a la institución "Santa Teresa", click en "Ver auditoría":

1. Confirmar que la lista de logs de ese tenant se ve, con la misma descripción de acciones que usa la vista del propio tenant (`describeAction`).
2. Buscar por el email de un actor conocido y confirmar que filtra.
3. Si hay algún log con `impersonated_by` seteado (del testing de la feature de impersonación), confirmar que aparece el badge "Vía impersonación".
4. Click en "Exportar CSV" — confirmar que descarga un archivo `auditoria.csv` con las filas esperadas (coincidiendo con el filtro de búsqueda activo).
5. Confirmar en la base que **no** se agregó ninguna fila nueva a `audit_logs` de ese tenant por haber visto o exportado:
   ```bash
   PGPASSWORD=eduapp psql -h localhost -p 5435 -U eduapp -d eduapp -c \
     "SELECT count(*) FROM tenant_santateresa.audit_logs;"
   ```
   (Anotar el conteo antes y después de los pasos 1-4 — debe ser igual.)

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/platform-tenant-audit/components/ \
  apps/web/src/app/platform/tenants/\[id\]/audit/ \
  apps/web/src/app/platform/tenants/\[id\]/page.tsx
git commit -m "feat(platform): agregar página de auditoría cross-tenant"
```

---

## Verificación final

- [ ] Correr toda la suite de backend una última vez: `cd apps/api && npm test` — debe pasar completo.
- [ ] Correr `cd apps/api && npm run build` y `cd apps/web && npm run build` — ambos deben compilar sin errores.
- [ ] Flujo manual end-to-end (ya cubierto en el Step 6 de la Task 4) — si no se hizo ahí, hacerlo ahora.
