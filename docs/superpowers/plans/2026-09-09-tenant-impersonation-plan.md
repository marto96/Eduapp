# Impersonación de tenant desde el panel de superadmin — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un superadmin pueda, desde la pestaña "Usuarios" de un tenant, entrar a la aplicación de ese tenant como si fuera un usuario específico (lectura y escritura completas), sin necesitar su contraseña, con una sesión corta que se puede cerrar explícitamente, y con cada acción hecha durante la impersonación marcada en la auditoría del tenant.

**Architecture:** Intercambio de token vía un código de un solo uso en Redis (TTL de 30s). El backend, ya autenticado como superadmin (`PlatformAdminGuard`), resuelve el tenant y el usuario, firma un JWT de tenant normal (mismo formato que un login real) con un campo nuevo `impersonatedBy`, lo guarda en Redis bajo un código random, y devuelve una URL de handoff al subdominio del tenant. Una ruta nueva en el frontend del tenant canjea ese código por el token, lo guarda en la cookie `access_token` (sin refresh token — la sesión expira sola), y de ahí en más el usuario navega la app del tenant sin ningún cambio en el resto del código (el guard/estrategia JWT existentes no distinguen un token de impersonación de uno normal). Cada acción de escritura queda marcada con `impersonated_by` en `audit_logs`, vía una extensión mínima del `AuditInterceptor` ya existente.

**Tech Stack:** NestJS (hexagonal), `@nestjs/jwt`, `ioredis` (cliente crudo, sin wrapper), TypeORM, Next.js App Router + React Query.

**Spec:** [docs/superpowers/specs/2026-09-09-tenant-impersonation-design.md](../specs/2026-09-09-tenant-impersonation-design.md)

## Global Constraints

- Alcance: cualquier usuario del tenant, sin restricción de rol — pero **nunca uno con `status !== 'active'`** (se rechaza con 400).
- Permisos durante la impersonación: completos (lectura y escritura), igual que el usuario real.
- Las sesiones coexisten — nunca se revoca ni se toca la sesión real del usuario impersonado.
- La sesión de impersonación **no emite refresh token** — solo un access token con expiración propia (`IMPERSONATION_SESSION_EXPIRES_IN`, default `45m`). Al vencer, no hay forma de renovarla.
- El JWT nunca viaja en una URL ni queda en logs: se guarda en Redis bajo un código de un solo uso (`impersonation:handoff:<uuid>`, TTL 30s), borrado en el primer canje.
- `actorId`/`actorEmail` de cada `audit_logs` siguen siendo los del usuario real impersonado; `impersonated_by` (columna nueva, `uuid NULL`) es el dato adicional que marca que la acción se hizo vía impersonación. Nunca se reutiliza un campo existente (`actorRoles`, etc.) para esto — mismo criterio que ya costó un bug real en el plan anterior de gestión de usuarios por tenant.
- La ruta de consumo del handoff vive en `/impersonate/consume` (no bajo `/api/`) — el `matcher` de `apps/web/src/middleware.ts` no la intercepta (confirmado: no está en esa lista), así que **no hace falta tocar `middleware.ts`**.
- Ninguna otra parte del código del tenant (guards, estrategia JWT, resto de controladores) necesita cambios — `impersonatedBy` es un campo opcional en `JwtPayload` que solo leen los puntos puntuales de este plan.

---

## Task 1: Extender el rastro de auditoría para impersonación

**Files:**
- Modify: `apps/api/src/core/auth/jwt-payload.interface.ts`
- Modify: `apps/api/src/modules/audit/domain/entities/audit-log.entity.ts`
- Modify: `apps/api/src/modules/audit/infrastructure/entities/audit-log.orm-entity.ts`
- Modify: `apps/api/src/modules/audit/application/ports/audit-log.repository.port.ts`
- Modify: `apps/api/src/modules/audit/infrastructure/repositories/typeorm-audit-log.repository.ts`
- Modify: `apps/api/src/modules/audit/application/use-cases/list-audit-logs.use-case.spec.ts`
- Modify: `apps/api/src/modules/audit/interface/audit.interceptor.ts`
- Modify: `apps/api/src/modules/audit/interface/audit.interceptor.spec.ts`
- Create: `apps/api/src/core/database/migrations/tenant/1700000000064-AddImpersonatedByToAuditLogs.ts`

**Interfaces:**
- Produces: `JwtPayload.impersonatedBy?: string` — usado por las Tasks 2 y 3. `AuditLog` con un 13er parámetro posicional `impersonatedBy: string | null` (al final, después de `createdAt`) — solo tiene dos call sites en todo el código, ambos listados abajo. `RecordAuditLogEntry.impersonatedBy?: string | null` — usado por el `AuditInterceptor`.

- [ ] **Step 1: Agregar `impersonatedBy` a `JwtPayload`**

Reemplazar el contenido completo de `apps/api/src/core/auth/jwt-payload.interface.ts`:

```ts
export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  tenantId: string;
  /** Solo presente en refresh tokens — identifica el token para poder revocarlo. */
  jti?: string;
  exp?: number;
  /**
   * Presente solo cuando este access token fue emitido por
   * `PlatformImpersonateTenantUserUseCase` — el `sub` (uuid) del superadmin
   * de plataforma que está impersonando a este usuario. Nunca se firma en
   * un login normal.
   */
  impersonatedBy?: string;
}
```

- [ ] **Step 2: Escribir el test que falla para el interceptor de auditoría**

En `apps/api/src/modules/audit/interface/audit.interceptor.spec.ts`, modificar la firma de `buildContext` (línea 38) para aceptar `impersonatedBy` opcional en `user`:

```ts
    user?: { sub: string; email: string; roles: string[]; impersonatedBy?: string };
```

Y agregar estos dos tests nuevos al final del `describe('AuditInterceptor', ...)`, justo antes del `});` de cierre:

```ts
  it('incluye impersonatedBy en el log cuando el JWT actual viene de una sesión impersonada', (done) => {
    const context = buildContext({
      method: 'PATCH',
      url: '/users/user-1',
      params: { id: 'user-1' },
      user: { sub: 'user-1', email: 'a@a.com', roles: ['docente'], impersonatedBy: 'admin-1' },
    });

    interceptor.intercept(context, buildHandler({ ok: true })).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).toHaveBeenCalledWith(
          expect.objectContaining({ impersonatedBy: 'admin-1' }),
        );
        done();
      });
    });
  });

  it('deja impersonatedBy en null cuando la sesión no es una impersonación', (done) => {
    const context = buildContext({
      method: 'DELETE',
      url: '/academic/sections/sec-1',
      params: { id: 'sec-1' },
      user: { sub: 'user-1', email: 'admin@test.com', roles: ['admin_institucion'] },
    });

    interceptor.intercept(context, buildHandler({ ok: true })).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).toHaveBeenCalledWith(
          expect.objectContaining({ impersonatedBy: null }),
        );
        done();
      });
    });
  });
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest audit.interceptor.spec.ts`
Expected: FAIL en los dos tests nuevos — el interceptor todavía no incluye `impersonatedBy` en el objeto que le pasa a `recordAuditLog.execute`.

- [ ] **Step 4: Implementar el campo en el interceptor**

En `apps/api/src/modules/audit/interface/audit.interceptor.ts`, en el objeto `base` (línea 80-89), agregar una línea después de `actorRoles`:

```ts
    const user = (request as Request & { user?: JwtPayload }).user;
    const base = {
      actorId: user?.sub ?? null,
      actorEmail: user?.email ?? null,
      actorRoles: user?.roles ?? null,
      impersonatedBy: user?.impersonatedBy ?? null,
      method,
      route: request.originalUrl.split('?')[0],
      resourceId: request.params?.id ?? resourceIdFromRead ?? null,
      ipAddress: request.ip ?? null,
      kind,
    };
```

- [ ] **Step 5: Extender `RecordAuditLogEntry` y `AuditLog`**

En `apps/api/src/modules/audit/application/ports/audit-log.repository.port.ts`, agregar un campo opcional a la interfaz (después de `ipAddress`):

```ts
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
  impersonatedBy?: string | null;
}
```

Es opcional a propósito: los otros dos call sites que construyen este objeto (`recordPlatformAudit` en el módulo `platform`, y el propio `AuditInterceptor` que ya lo pasa siempre) no necesitan tocarse — `recordPlatformAudit` sigue sin pasarlo (la impersonación empieza vía plataforma, no es una acción "impersonada").

En `apps/api/src/modules/audit/domain/entities/audit-log.entity.ts`, reemplazar el contenido completo:

```ts
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
    public readonly impersonatedBy: string | null,
  ) {}
}
```

- [ ] **Step 6: Actualizar los dos call sites de `new AuditLog(...)`**

Hay exactamente dos en todo el código (confirmado por `grep -rn "new AuditLog(" apps/api/src`).

En `apps/api/src/modules/audit/infrastructure/repositories/typeorm-audit-log.repository.ts`, el método `toDomain` (línea 59-74) — agregar `row.impersonatedBy` como último argumento:

```ts
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
      row.impersonatedBy,
    );
  }
```

En `apps/api/src/modules/audit/application/use-cases/list-audit-logs.use-case.spec.ts`, el fixture `entry` (línea 13-26) — agregar `null` como último argumento:

```ts
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
    null,
  );
```

- [ ] **Step 7: Agregar la columna a la entidad ORM**

En `apps/api/src/modules/audit/infrastructure/entities/audit-log.orm-entity.ts`, agregar después de la columna `ipAddress` (antes de `createdAt`):

```ts
  @Column({ name: 'impersonated_by', type: 'uuid', nullable: true })
  impersonatedBy: string | null;
```

- [ ] **Step 8: Crear la migración**

Crear `apps/api/src/core/database/migrations/tenant/1700000000064-AddImpersonatedByToAuditLogs.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marca, además del actor real (el usuario impersonado), si la acción se
 * hizo a través de una sesión de impersonación de un superadmin — ver
 * docs/superpowers/specs/2026-09-09-tenant-impersonation-design.md.
 */
export class AddImpersonatedByToAuditLogs1700000000064 implements MigrationInterface {
  name = 'AddImpersonatedByToAuditLogs1700000000064';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_logs" ADD COLUMN "impersonated_by" uuid NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "impersonated_by"`);
  }
}
```

- [ ] **Step 9: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest audit.interceptor.spec.ts list-audit-logs.use-case.spec.ts record-audit-log.use-case.spec.ts`
Expected: PASS — todos los tests existentes y los 2 nuevos.

- [ ] **Step 10: Correr la migración contra la base de desarrollo**

Run: `cd apps/api && npm run migration:run:tenant:all`
Expected: corre sin error contra todos los schemas de tenant existentes (`tenant_santateresa`, `tenant_colegio_demo`, etc.).

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/core/auth/jwt-payload.interface.ts \
  apps/api/src/modules/audit/domain/entities/audit-log.entity.ts \
  apps/api/src/modules/audit/infrastructure/entities/audit-log.orm-entity.ts \
  apps/api/src/modules/audit/application/ports/audit-log.repository.port.ts \
  apps/api/src/modules/audit/infrastructure/repositories/typeorm-audit-log.repository.ts \
  apps/api/src/modules/audit/application/use-cases/list-audit-logs.use-case.spec.ts \
  apps/api/src/modules/audit/interface/audit.interceptor.ts \
  apps/api/src/modules/audit/interface/audit.interceptor.spec.ts \
  apps/api/src/core/database/migrations/tenant/1700000000064-AddImpersonatedByToAuditLogs.ts
git commit -m "feat(audit): agregar impersonatedBy al rastro de auditoría"
```

---

## Task 2: `PlatformImpersonateTenantUserUseCase` y endpoint de plataforma

**Files:**
- Create: `apps/api/src/modules/platform/application/use-cases/platform-impersonate-tenant-user.use-case.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-impersonate-tenant-user.use-case.spec.ts`
- Modify: `apps/api/src/modules/platform/interface/controllers/platform-tenant-users.controller.ts`
- Modify: `apps/api/src/modules/platform/platform.module.ts`
- Modify: `apps/api/src/core/config/env.validation.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `TenantRepositoryPort.findById` (existente); `withTenantSchemaConnection`, `recordPlatformAudit` (existentes, del plan anterior); `TypeOrmUserRepository.findById` (existente); `JwtPayload.impersonatedBy` (Task 1); `REDIS_CLIENT` (existente, `apps/api/src/core/cache/redis.module.ts`).
- Produces: `PlatformImpersonateTenantUserUseCase.execute(tenantId, userId, platformAdmin): Promise<{ handoffUrl: string }>`, ruta `POST /platform/tenants/:tenantId/users/:id/impersonate` — usada por la Task 4.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `apps/api/src/modules/platform/application/use-cases/platform-impersonate-tenant-user.use-case.spec.ts`:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { PlatformImpersonateTenantUserUseCase } from './platform-impersonate-tenant-user.use-case';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';

jest.mock('../../infrastructure/tenant-schema-connection');
jest.mock('../../infrastructure/record-platform-audit');
jest.mock('../../../identity/infrastructure/repositories/typeorm-user.repository');

describe('PlatformImpersonateTenantUserUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };

  const configValues: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access-secret',
    IMPERSONATION_SESSION_EXPIRES_IN: '45m',
    TENANT_BASE_DOMAIN: 'localhost:3000',
  };
  const jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as jest.Mocked<JwtService>;
  const config = { get: jest.fn((key: string) => configValues[key]) } as unknown as jest.Mocked<ConfigService>;
  const redis = { set: jest.fn().mockResolvedValue('OK') };

  const useCase = new PlatformImpersonateTenantUserUseCase(tenants, jwt, config, redis as unknown as Redis);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const platformAdmin: PlatformJwtPayload = { sub: 'admin-1', email: 'super@eduapp.test', scope: 'platform' };
  const activeUser = new User(
    'user-1', 'a@santateresa.test', 'hash', 'Ana', 'Admin', ['docente'], 'active',
    0, null, null, null, null, null,
  );
  const suspendedUser = new User(
    'user-2', 'b@santateresa.test', 'hash', 'Bruno', 'Docente', ['docente'], 'suspended',
    0, null, null, null, null, null,
  );

  const fakeUserRepo = { findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), findById: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmUserRepository as jest.Mock).mockImplementation(() => fakeUserRepo);
    fakeUserRepo.findById.mockResolvedValue(activeUser);
    (jwt.sign as jest.Mock).mockReturnValue('signed.jwt.token');
    redis.set.mockResolvedValue('OK');
  });

  it('rechaza si el tenant no existe, sin intentar abrir ninguna conexión', async () => {
    tenants.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant-x', 'user-1', platformAdmin)).rejects.toThrow(NotFoundException);
    expect(withTenantSchemaConnection).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario no existe', async () => {
    fakeUserRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant-1', 'user-x', platformAdmin)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el usuario no está activo, sin firmar ningún token', async () => {
    fakeUserRepo.findById.mockResolvedValue(suspendedUser);

    await expect(useCase.execute('tenant-1', 'user-2', platformAdmin)).rejects.toThrow(BadRequestException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('firma un access token con impersonatedBy y sin refresh token, lo guarda en Redis con TTL de 30s, y devuelve la handoffUrl con el código', async () => {
    const result = await useCase.execute('tenant-1', 'user-1', platformAdmin);

    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 'user-1', email: 'a@santateresa.test', roles: ['docente'], tenantId: 'tenant-1', impersonatedBy: 'admin-1' },
      { secret: 'access-secret', expiresIn: '45m' },
    );
    expect(redis.set).toHaveBeenCalledWith(expect.any(String), 'signed.jwt.token', 'EX', 30);

    const [redisKey] = redis.set.mock.calls[0];
    expect(redisKey).toMatch(/^impersonation:handoff:/);
    const code = redisKey.replace('impersonation:handoff:', '');
    expect(result.handoffUrl).toBe(`http://santateresa.localhost:3000/impersonate/consume?code=${code}`);
  });

  it('usa el dominio propio del tenant (https) si tiene uno configurado, en vez de subdominio.dominio_base', async () => {
    const tenantWithCustomDomain = new Tenant(
      'tenant-1', 'Santa Teresa', 'santateresa', 'santateresa.edu.co', 'tenant_santateresa', 'active', [],
    );
    tenants.findById.mockResolvedValue(tenantWithCustomDomain);

    const result = await useCase.execute('tenant-1', 'user-1', platformAdmin);

    const [redisKey] = redis.set.mock.calls[0];
    const code = redisKey.replace('impersonation:handoff:', '');
    expect(result.handoffUrl).toBe(`https://santateresa.edu.co/impersonate/consume?code=${code}`);
  });

  it('audita el inicio de la impersonación', async () => {
    await useCase.execute('tenant-1', 'user-1', platformAdmin);

    expect(recordPlatformAudit).toHaveBeenCalledWith(fakeDataSource, 'impersonate', 'User', 'user-1', platformAdmin);
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd apps/api && npx jest platform-impersonate-tenant-user.use-case.spec.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Agregar las dos env vars nuevas**

En `apps/api/src/core/config/env.validation.ts`, agregar después del bloque `PLATFORM_JWT_EXPIRES_IN` (línea 22):

```ts
  // Impersonación de tenant desde el panel de superadmin: duración de la
  // sesión emitida (sin refresh token — al vencer no se puede renovar) y
  // dominio base para armar la URL de handoff de cada tenant (sin
  // protocolo; en dev es el host:puerto del propio frontend).
  IMPERSONATION_SESSION_EXPIRES_IN: Joi.string().default('45m'),
  TENANT_BASE_DOMAIN: Joi.string().default('localhost:3000'),
```

En `.env.example` (raíz del repo), agregar después de `PLATFORM_JWT_EXPIRES_IN=8h`:

```
IMPERSONATION_SESSION_EXPIRES_IN=45m
TENANT_BASE_DOMAIN=localhost:3000
```

- [ ] **Step 4: Implementar `PlatformImpersonateTenantUserUseCase`**

Crear `apps/api/src/modules/platform/application/use-cases/platform-impersonate-tenant-user.use-case.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../core/cache/redis.module';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

const HANDOFF_CODE_TTL_SECONDS = 30;

/**
 * Emite un access token de tenant normal (mismo formato que un login real)
 * marcado con `impersonatedBy`, y lo guarda en Redis bajo un código de un
 * solo uso — el JWT en sí nunca viaja en una URL ni queda en logs. No emite
 * refresh token: la sesión de impersonación expira sola, sin forma de
 * renovarse (ver Global Constraints del plan).
 */
@Injectable()
export class PlatformImpersonateTenantUserUseCase {
  constructor(
    @Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async execute(
    tenantId: string,
    userId: string,
    platformAdmin: PlatformJwtPayload,
  ): Promise<{ handoffUrl: string }> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      const user = await users.findById(userId);
      if (!user) {
        throw new NotFoundException(`No existe el usuario "${userId}"`);
      }
      if (user.status !== 'active') {
        throw new BadRequestException('No se puede impersonar a un usuario que no está activo');
      }

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        roles: user.roles,
        tenantId: tenant.id,
        impersonatedBy: platformAdmin.sub,
      };
      const accessToken = this.jwt.sign(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('IMPERSONATION_SESSION_EXPIRES_IN'),
      });

      const code = randomUUID();
      await this.redis.set(`impersonation:handoff:${code}`, accessToken, 'EX', HANDOFF_CODE_TTL_SECONDS);

      await recordPlatformAudit(dataSource, 'impersonate', 'User', user.id, platformAdmin);

      const baseDomain = this.config.get<string>('TENANT_BASE_DOMAIN')!;
      const host = tenant.customDomain ?? `${tenant.subdomain}.${baseDomain}`;
      const protocol = host.includes('localhost') ? 'http' : 'https';

      return { handoffUrl: `${protocol}://${host}/impersonate/consume?code=${code}` };
    });
  }
}
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `cd apps/api && npx jest platform-impersonate-tenant-user.use-case.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Agregar el endpoint al controlador**

En `apps/api/src/modules/platform/interface/controllers/platform-tenant-users.controller.ts`, agregar el import (junto a los otros use-cases, línea 10):

```ts
import { PlatformImpersonateTenantUserUseCase } from '../../application/use-cases/platform-impersonate-tenant-user.use-case';
```

Agregar al constructor (línea 42-49), como último parámetro:

```ts
  constructor(
    private readonly createUser: PlatformCreateTenantUserUseCase,
    private readonly listUsers: PlatformListTenantUsersUseCase,
    private readonly editUser: PlatformEditTenantUserUseCase,
    private readonly deactivateUser: PlatformDeactivateTenantUserUseCase,
    private readonly reactivateUser: PlatformReactivateTenantUserUseCase,
    private readonly resetPassword: PlatformResetTenantUserPasswordUseCase,
    private readonly impersonateUser: PlatformImpersonateTenantUserUseCase,
  ) {}
```

Y agregar el método nuevo, después de `reactivate` (después de la línea 106, antes del `}` de cierre de la clase):

```ts
  @Post(':id/impersonate')
  async impersonate(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
  ) {
    return this.impersonateUser.execute(tenantId, id, req.platformAdmin);
  }
```

- [ ] **Step 7: Registrar el use-case en el módulo**

En `apps/api/src/modules/platform/platform.module.ts`, agregar el import (junto a los otros use-cases de platform-tenant-users, línea 21):

```ts
import { PlatformImpersonateTenantUserUseCase } from './application/use-cases/platform-impersonate-tenant-user.use-case';
```

Y agregarlo al array `providers` (línea 53, junto a `PlatformResetTenantUserPasswordUseCase`):

```ts
    PlatformResetTenantUserPasswordUseCase,
    PlatformImpersonateTenantUserUseCase,
```

- [ ] **Step 8: Verificar que compila**

Run: `cd apps/api && npm run build`
Expected: compila sin errores.

- [ ] **Step 9: Correr toda la suite de backend**

Run: `cd apps/api && npm test`
Expected: PASS, sin regresiones.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/platform/application/use-cases/platform-impersonate-tenant-user.use-case.ts \
  apps/api/src/modules/platform/application/use-cases/platform-impersonate-tenant-user.use-case.spec.ts \
  apps/api/src/modules/platform/interface/controllers/platform-tenant-users.controller.ts \
  apps/api/src/modules/platform/platform.module.ts \
  apps/api/src/core/config/env.validation.ts \
  .env.example
git commit -m "feat(platform): agregar endpoint de impersonación de usuarios por tenant"
```

---

## Task 3: `ConsumeImpersonationUseCase` y endpoint de canje

**Files:**
- Create: `apps/api/src/modules/identity/application/use-cases/consume-impersonation.use-case.ts`
- Create: `apps/api/src/modules/identity/application/use-cases/consume-impersonation.use-case.spec.ts`
- Create: `apps/api/src/modules/identity/interface/dtos/consume-impersonation.dto.ts`
- Modify: `apps/api/src/modules/identity/interface/controllers/auth.controller.ts`
- Modify: `apps/api/src/modules/identity/identity.module.ts`

**Interfaces:**
- Consumes: `REDIS_CLIENT` (existente); `JwtPayload.impersonatedBy`/`tenantId` (Task 1, ya existente para `tenantId`).
- Produces: `ConsumeImpersonationUseCase.execute(code): Promise<{ accessToken: string }>`, ruta `POST /auth/impersonate/consume` — usada por la Task 5. `GET /auth/me` extendido con `impersonatedBy: string | null` y `tenantId: string` — usado por la Task 5.

- [ ] **Step 1: Escribir el test que falla**

Crear `apps/api/src/modules/identity/application/use-cases/consume-impersonation.use-case.spec.ts`:

```ts
import { GoneException } from '@nestjs/common';
import type Redis from 'ioredis';
import { ConsumeImpersonationUseCase } from './consume-impersonation.use-case';

describe('ConsumeImpersonationUseCase', () => {
  const redis = { get: jest.fn(), del: jest.fn() };
  const useCase = new ConsumeImpersonationUseCase(redis as unknown as Redis);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza un código inexistente o vencido', async () => {
    redis.get.mockResolvedValue(null);

    await expect(useCase.execute('code-x')).rejects.toThrow(GoneException);
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('devuelve el access token guardado y borra el código (uso único)', async () => {
    redis.get.mockResolvedValue('signed.jwt.token');

    const result = await useCase.execute('code-1');

    expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    expect(redis.get).toHaveBeenCalledWith('impersonation:handoff:code-1');
    expect(redis.del).toHaveBeenCalledWith('impersonation:handoff:code-1');
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest consume-impersonation.use-case.spec.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar el DTO y el use-case**

Crear `apps/api/src/modules/identity/interface/dtos/consume-impersonation.dto.ts`:

```ts
import { IsString } from 'class-validator';

export class ConsumeImpersonationDto {
  @IsString()
  code: string;
}
```

Crear `apps/api/src/modules/identity/application/use-cases/consume-impersonation.use-case.ts`:

```ts
import { GoneException, Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../core/cache/redis.module';

/**
 * Canjea un código de handoff de impersonación por el access token real —
 * de un solo uso, el código se borra apenas se lee. Ver
 * `PlatformImpersonateTenantUserUseCase`, que es quien lo genera.
 */
@Injectable()
export class ConsumeImpersonationUseCase {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async execute(code: string): Promise<{ accessToken: string }> {
    const key = `impersonation:handoff:${code}`;
    const accessToken = await this.redis.get(key);
    if (!accessToken) {
      throw new GoneException('El enlace de acceso venció, pedí uno nuevo desde el panel');
    }
    await this.redis.del(key);
    return { accessToken };
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest consume-impersonation.use-case.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Agregar el endpoint y extender `/auth/me`**

En `apps/api/src/modules/identity/interface/controllers/auth.controller.ts`, agregar el import:

```ts
import { ConsumeImpersonationUseCase } from '../../application/use-cases/consume-impersonation.use-case';
import { ConsumeImpersonationDto } from '../dtos/consume-impersonation.dto';
```

Agregar al constructor, como último parámetro:

```ts
  constructor(
    private readonly authenticateUser: AuthenticateUserUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly logout: LogoutUseCase,
    private readonly consumeImpersonation: ConsumeImpersonationUseCase,
  ) {}
```

Agregar el endpoint nuevo, después de `refresh` (después de la línea 37):

```ts
  @Public()
  @AuditSkip()
  @Post('impersonate/consume')
  @HttpCode(200)
  async consumeImpersonationCode(@Body() dto: ConsumeImpersonationDto) {
    return this.consumeImpersonation.execute(dto.code);
  }
```

(`@AuditSkip()` porque no hay `request.user` todavía en este punto — mismo criterio que ya usa `refresh`, un mecanismo interno de auth, no una acción de negocio auditable.)

Y reemplazar el método `me` (línea 51-58) por:

```ts
  @Get('me')
  async me(@CurrentUser() currentUser: JwtPayload) {
    const user = await this.getCurrentUser.execute(currentUser.sub);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      impersonatedBy: currentUser.impersonatedBy ?? null,
      tenantId: currentUser.tenantId,
    };
  }
```

- [ ] **Step 6: Registrar el use-case en el módulo**

En `apps/api/src/modules/identity/identity.module.ts`, agregar el import (línea 8, junto a `GetCurrentUserUseCase`):

```ts
import { ConsumeImpersonationUseCase } from './application/use-cases/consume-impersonation.use-case';
```

Y agregarlo al array `providers` (línea 39, junto a `GetCurrentUserUseCase`):

```ts
    GetCurrentUserUseCase,
    ConsumeImpersonationUseCase,
```

- [ ] **Step 7: Verificar que compila**

Run: `cd apps/api && npm run build`
Expected: compila sin errores.

- [ ] **Step 8: Correr toda la suite de backend**

Run: `cd apps/api && npm test`
Expected: PASS, sin regresiones.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/identity/application/use-cases/consume-impersonation.use-case.ts \
  apps/api/src/modules/identity/application/use-cases/consume-impersonation.use-case.spec.ts \
  apps/api/src/modules/identity/interface/dtos/consume-impersonation.dto.ts \
  apps/api/src/modules/identity/interface/controllers/auth.controller.ts \
  apps/api/src/modules/identity/identity.module.ts
git commit -m "feat(auth): agregar endpoint de canje de código de impersonación y extender /auth/me"
```

---

## Task 4: Frontend de plataforma — hook, BFF y botón "Entrar como"

**Files:**
- Modify: `apps/web/src/features/platform-tenant-users/use-platform-tenant-users.ts`
- Create: `apps/web/src/app/api/platform/tenants/[id]/users/[userId]/impersonate/route.ts`
- Modify: `apps/web/src/features/platform-tenant-users/components/platform-tenant-users-list.tsx`

**Interfaces:**
- Consumes: `platformApiFetchWithStatus` (existente, `lib/platform-api.ts`); `POST /platform/tenants/:tenantId/users/:id/impersonate` (Task 2).
- Produces: `useImpersonatePlatformTenantUser()` — hook de mutación que devuelve `{ handoffUrl: string }`, usado por `PlatformTenantUsersList`.

- [ ] **Step 1: Agregar la ruta BFF**

Crear `apps/web/src/app/api/platform/tenants/[id]/users/[userId]/impersonate/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { platformApiFetchWithStatus } from '@/lib/platform-api';

export async function POST(_req: Request, { params }: { params: { id: string; userId: string } }) {
  const { status, body } = await platformApiFetchWithStatus<{ handoffUrl: string }>(
    `/platform/tenants/${params.id}/users/${params.userId}/impersonate`,
    { method: 'POST' },
  );
  if (status < 200 || status >= 300) {
    const message = (body as { message?: string } | null)?.message ?? 'No se pudo iniciar la impersonación';
    return NextResponse.json({ message }, { status });
  }
  return NextResponse.json(body);
}
```

- [ ] **Step 2: Agregar el hook**

En `apps/web/src/features/platform-tenant-users/use-platform-tenant-users.ts`, agregar al final del archivo (después de `useReactivatePlatformTenantUser`):

```ts
async function impersonatePlatformTenantUser({
  tenantId,
  id,
}: {
  tenantId: string;
  id: string;
}): Promise<{ handoffUrl: string }> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/users/${id}/impersonate`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo iniciar la impersonación');
  }
  return res.json();
}

export function useImpersonatePlatformTenantUser() {
  return useMutation({ mutationFn: impersonatePlatformTenantUser });
}
```

- [ ] **Step 3: Agregar el botón "Entrar como" a la lista**

Reemplazar el contenido completo de `apps/web/src/features/platform-tenant-users/components/platform-tenant-users-list.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Ban, KeyRound, LogIn, Pencil } from 'lucide-react';
import {
  usePlatformTenantUsers,
  useResetPlatformTenantUserPassword,
  useDeactivatePlatformTenantUser,
  useReactivatePlatformTenantUser,
  useImpersonatePlatformTenantUser,
} from '../use-platform-tenant-users';
import { EditPlatformTenantUserModal } from './edit-platform-tenant-user-modal';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { TenantUser } from '@eduapp/shared-types';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 350;

const STATUS_LABELS: Record<TenantUser['status'], string> = {
  active: 'Activo',
  invited: 'Invitado',
  suspended: 'Inactivo',
};

const STATUS_CLASSES: Record<TenantUser['status'], string> = {
  active: 'bg-primary/10 text-primary',
  invited: 'bg-muted text-muted-foreground',
  suspended: 'bg-destructive/10 text-destructive',
};

export function PlatformTenantUsersList({ tenantId }: { tenantId: string }) {
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

  const { data, isLoading, error } = usePlatformTenantUsers({
    tenantId,
    page,
    pageSize,
    search: committedSearch || undefined,
  });
  const users = data?.items;
  const resetPassword = useResetPlatformTenantUserPassword();
  const deactivateUser = useDeactivatePlatformTenantUser();
  const reactivateUser = useReactivatePlatformTenantUser();
  const impersonateUser = useImpersonatePlatformTenantUser();
  const [revealed, setRevealed] = useState<{ userId: string; password: string } | null>(null);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<TenantUser | null>(null);
  const [resetErrorUserId, setResetErrorUserId] = useState<string | null>(null);
  const [reactivateErrorUserId, setReactivateErrorUserId] = useState<string | null>(null);
  const [impersonateErrorUserId, setImpersonateErrorUserId] = useState<string | null>(null);

  const filters = (
    <Input
      placeholder="Buscar por nombre o email..."
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
        <p className="text-sm text-destructive">No se pudieron cargar los usuarios.</p>
      </div>
    );
  }
  if (!users || users.length === 0) {
    return (
      <div className="space-y-3">
        {filters}
        <p className="text-sm text-muted-foreground">
          {committedSearch ? 'No hay usuarios que coincidan con la búsqueda.' : 'Todavía no hay usuarios.'}
        </p>
      </div>
    );
  }

  function handleReset(userId: string) {
    setRevealed(null);
    setResetErrorUserId(null);
    resetPassword.mutate(
      { tenantId, id: userId },
      {
        onSuccess: ({ temporaryPassword }) => setRevealed({ userId, password: temporaryPassword }),
        onError: () => setResetErrorUserId(userId),
      },
    );
  }

  function handleReactivate(userId: string) {
    setReactivateErrorUserId(null);
    reactivateUser.mutate(
      { tenantId, id: userId },
      { onError: () => setReactivateErrorUserId(userId) },
    );
  }

  function handleImpersonate(userId: string) {
    setImpersonateErrorUserId(null);
    impersonateUser.mutate(
      { tenantId, id: userId },
      {
        onSuccess: ({ handoffUrl }) => {
          window.location.href = handoffUrl;
        },
        onError: () => setImpersonateErrorUserId(userId),
      },
    );
  }

  function confirmDeactivate() {
    if (!deactivatingUser) return;
    deactivateUser.mutate({ tenantId, id: deactivatingUser.id }, { onSuccess: () => setDeactivatingUser(null) });
  }

  return (
    <div className="space-y-3">
      {filters}
      <ul className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
        {users.map((user) => (
          <Card key={user.id} className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{user.fullName}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[user.status]}`}>
                  {STATUS_LABELS[user.status]}
                </span>
                <span className="text-xs uppercase text-muted-foreground">{user.roles.join(', ')}</span>
                <button
                  type="button"
                  title="Resetear contraseña"
                  aria-label="Resetear contraseña"
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  disabled={resetPassword.isPending}
                  onClick={() => handleReset(user.id)}
                >
                  <KeyRound className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Editar usuario"
                  aria-label="Editar usuario"
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setEditingUser(user)}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {user.status === 'active' && (
                  <button
                    type="button"
                    title="Entrar como este usuario"
                    aria-label="Entrar como este usuario"
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                    disabled={impersonateUser.isPending}
                    onClick={() => handleImpersonate(user.id)}
                  >
                    <LogIn className="h-4 w-4" />
                  </button>
                )}
                {user.status === 'suspended' ? (
                  <button
                    type="button"
                    className="text-xs text-primary underline hover:text-primary/80 disabled:opacity-50"
                    disabled={reactivateUser.isPending}
                    onClick={() => handleReactivate(user.id)}
                  >
                    Reactivar
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Inactivar usuario"
                    aria-label="Inactivar usuario"
                    className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeactivatingUser(user)}
                  >
                    <Ban className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {revealed?.userId === user.id && (
              <div className="mt-2 rounded border border-primary/40 bg-primary/5 p-2 text-xs">
                <p>
                  Contraseña temporal: <span className="font-mono font-medium">{revealed.password}</span>
                </p>
                <p className="mt-1 text-muted-foreground">
                  Copiala ahora y comunicásela al usuario — no se va a volver a mostrar.
                </p>
                <button type="button" className="mt-1 underline" onClick={() => setRevealed(null)}>
                  Cerrar
                </button>
              </div>
            )}
            {resetErrorUserId === user.id && resetPassword.isError && (
              <p className="mt-2 text-sm text-destructive">{resetPassword.error.message}</p>
            )}
            {reactivateErrorUserId === user.id && reactivateUser.isError && (
              <p className="mt-2 text-sm text-destructive">{reactivateUser.error.message}</p>
            )}
            {impersonateErrorUserId === user.id && impersonateUser.isError && (
              <p className="mt-2 text-sm text-destructive">{impersonateUser.error.message}</p>
            )}
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
      <EditPlatformTenantUserModal tenantId={tenantId} user={editingUser} onClose={() => setEditingUser(null)} />
      <ConfirmDialog
        open={deactivatingUser !== null}
        onClose={() => {
          setDeactivatingUser(null);
          deactivateUser.reset();
        }}
        onConfirm={confirmDeactivate}
        title="Inactivar usuario"
        description={`¿Inactivar a ${deactivatingUser?.fullName}? Va a perder acceso a la plataforma hasta que lo reactives.`}
        confirmLabel="Inactivar"
        isConfirming={deactivateUser.isPending}
        errorMessage={deactivateUser.isError ? deactivateUser.error.message : undefined}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verificar que el frontend compila**

Run: `cd apps/web && npm run build`
Expected: compila sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/platform-tenant-users/use-platform-tenant-users.ts \
  apps/web/src/app/api/platform/tenants/\[id\]/users/\[userId\]/impersonate/ \
  apps/web/src/features/platform-tenant-users/components/platform-tenant-users-list.tsx
git commit -m "feat(platform): agregar botón de impersonación de usuarios por tenant"
```

---

## Task 5: Frontend del tenant — consumo del handoff, banner, y verificación final

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Create: `apps/web/src/app/impersonate/consume/route.ts`
- Create: `apps/web/src/components/impersonation-banner.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `POST /auth/impersonate/consume` (Task 3); `GET /auth/me` extendido (Task 3); `handoffUrl` generada por la Task 2/4.
- Produces: nada consumido por otra task — este es el último paso del flujo.

- [ ] **Step 1: Extender `AuthenticatedUser`**

En `packages/shared-types/src/index.ts`, reemplazar la interfaz `AuthenticatedUser` (línea 9-14):

```ts
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  impersonatedBy: string | null;
  tenantId: string;
}
```

- [ ] **Step 2: Agregar `NEXT_PUBLIC_PLATFORM_URL` al `.env.example`**

En `.env.example`, agregar después de `NEXT_PUBLIC_TENANT_SUBDOMAIN=colegio-demo`:

```
# URL pública del panel de superadmin — a donde vuelve el botón "Salir"
# del banner de impersonación. En este entorno de desarrollo, plataforma y
# tenant comparten el mismo servidor Next.js (solo cambia el path/host).
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3000
```

- [ ] **Step 3: Crear la ruta de consumo del handoff**

Crear `apps/web/src/app/impersonate/consume/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

/**
 * Canjea el código de handoff de una impersonación por el access token real
 * y lo guarda en la misma cookie que usa un login normal — sin
 * refresh_token, ya que la sesión de impersonación no emite uno (ver
 * `PlatformImpersonateTenantUserUseCase`). No pasa por
 * `apps/web/src/middleware.ts` (no está en su `matcher`), así que no hay
 * chequeo de sesión que sortear acá.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const apiRes = await fetch(`${API_URL}/auth/impersonate/consume`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    body: JSON.stringify({ code }),
  });

  if (!apiRes.ok) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'impersonation_expired');
    return NextResponse.redirect(loginUrl);
  }

  const { accessToken } = await apiRes.json();
  const isProd = process.env.NODE_ENV === 'production';

  const response = NextResponse.redirect(new URL('/dashboard', req.url));
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
```

- [ ] **Step 4: Crear el banner de impersonación**

Crear `apps/web/src/components/impersonation-banner.tsx`:

```tsx
'use client';

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL ?? 'http://localhost:3000';

export function ImpersonationBanner({ fullName, tenantId }: { fullName: string; tenantId: string }) {
  async function handleExit() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = `${PLATFORM_URL}/platform/tenants/${tenantId}`;
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <span>Estás viendo esto como {fullName}</span>
      <button type="button" onClick={handleExit} className="underline hover:no-underline">
        Salir
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Insertar el banner en el layout autenticado del tenant**

Reemplazar el contenido completo de `apps/web/src/app/(dashboard)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { PageTitle } from '@/components/page-title';
import { ThemeToggle } from '@/components/theme-toggle';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { getCurrentUser, getTenantBranding } from '@/lib/server-api';
import { formatRoles, getInitials } from '@/lib/roles';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, branding] = await Promise.all([getCurrentUser(), getTenantBranding()]);
  if (!user) redirect('/login');

  return (
    <>
      {user.impersonatedBy && <ImpersonationBanner fullName={user.fullName} tenantId={user.tenantId} />}
      <div className="flex min-h-screen">
        <Sidebar branding={branding} roles={user.roles} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-3">
            <PageTitle />
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="h-8 w-px bg-border" />
              <div className="text-right">
                <p className="text-sm font-medium leading-tight">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">{formatRoles(user.roles)}</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                {getInitials(user.fullName)}
              </div>
            </div>
          </header>
          {children}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Verificar que ambos builds compilan**

Run: `cd apps/api && npm run build && cd ../web && npm run build`
Expected: ambos compilan sin errores. (El cambio a `packages/shared-types` lo consumen ambos apps — confirmar que no rompe ningún otro uso de `AuthenticatedUser` en `apps/web`.)

- [ ] **Step 7: Correr toda la suite de backend una última vez**

Run: `cd apps/api && npm test`
Expected: PASS, sin regresiones.

- [ ] **Step 8: Verificar a mano en el navegador (flujo completo)**

Con el stack corriendo (backend, Postgres, Redis, frontend), loguearse en `/platform/login` como superadmin, entrar a la institución "Santa Teresa", y en la pestaña "Usuarios":

1. Click en "Entrar como" sobre un usuario activo cualquiera.
2. Confirmar que el navegador termina en el dashboard del tenant (`http://santateresa.<TENANT_BASE_DOMAIN>/dashboard`), ya logueado como ese usuario — sin haber tipeado ninguna contraseña.
3. Confirmar que el banner ámbar aparece arriba de todo, con el nombre completo correcto y el botón "Salir".
4. Hacer una acción de escritura cualquiera como ese usuario (ej. editar algo en `/users` si tiene el rol, o cualquier acción que el rol permita).
5. Confirmar en la base que quedó auditada con `impersonated_by` seteado:
   ```bash
   PGPASSWORD=eduapp psql -h localhost -p 5435 -U eduapp -d eduapp -c \
     "SELECT actor_id, impersonated_by, method, route FROM tenant_santateresa.audit_logs ORDER BY created_at DESC LIMIT 1;"
   ```
   Expected: `actor_id` es el id real del usuario impersonado, `impersonated_by` es el uuid del superadmin (no null).
6. Click en "Salir" del banner — confirmar que vuelve a `/platform/tenants/<id>` (la pestaña de Usuarios de donde salió).
7. Confirmar que la sesión real de ese usuario (si tenía una abierta en otro navegador/pestaña) sigue intacta — no se cerró.
8. Intentar impersonar a un usuario con `status: 'suspended'` — confirmar que el botón "Entrar como" ni siquiera aparece para ese usuario en la lista.

- [ ] **Step 9: Commit**

```bash
git add packages/shared-types/src/index.ts \
  .env.example \
  apps/web/src/app/impersonate/consume/route.ts \
  apps/web/src/components/impersonation-banner.tsx \
  apps/web/src/app/\(dashboard\)/layout.tsx
git commit -m "feat(tenant): agregar consumo de handoff y banner de impersonación"
```

---

## Verificación final

- [ ] Correr toda la suite de backend una última vez: `cd apps/api && npm test` — debe pasar completo.
- [ ] Correr `cd apps/api && npm run build` y `cd apps/web && npm run build` — ambos deben compilar sin errores.
- [ ] Flujo manual end-to-end (ya cubierto en el Step 8 de la Task 5) — si no se hizo ahí, hacerlo ahora: impersonar a un usuario, hacer una acción de escritura, confirmar `impersonated_by` en la auditoría, salir con el banner.
