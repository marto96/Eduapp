# Gestión de usuarios por tenant desde plataforma — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un superadmin de plataforma cree, edite, desactive, reactive y resetee la contraseña de usuarios de cualquier tenant, sin tener que impersonarlo — resolviendo el bloqueo real de hoy (un tenant recién creado no tiene ningún usuario que pueda loguearse).

**Architecture:** Seis use-cases nuevos en el módulo `platform` que, dado un `tenantId`, resuelven su `schemaName` y abren una conexión puntual a ese schema (mismo mecanismo que `SchemaProvisionerAdapter`), y ahí adentro **reusan tal cual** los use-cases ya existentes de `identity` (`CreateUserUseCase`, `EditUserUseCase`, etc.) construidos a mano contra esa conexión — cero lógica de negocio duplicada. Cada acción registra su propio audit log en el tenant afectado, de forma best-effort.

**Tech Stack:** NestJS (hexagonal), TypeORM, Next.js App Router + React Query. Sin framework de test en `apps/web` — verificación manual en navegador para el frontend.

**Spec:** [docs/superpowers/specs/2026-09-08-platform-tenant-users-design.md](../specs/2026-09-08-platform-tenant-users-design.md)

## Global Constraints

- El listado es **por tenant, no cross-tenant** — nunca se implementa un listado que junte usuarios de todos los tenants.
- Los 6 use-cases de `identity` (`CreateUserUseCase`, `ListUsersUseCase`, `EditUserUseCase`, `DeactivateUserUseCase`, `ReactivateUserUseCase`, `ResetUserPasswordUseCase`) se **reusan tal cual, instanciados a mano** — nunca se duplica su lógica de validación.
- No se toca `CreateTenantUseCase` ni el formulario de crear institución — crear el primer admin de un tenant nuevo se hace desde la pestaña "Usuarios" nueva, con el mismo formulario que cualquier usuario futuro.
- Cada acción de **escritura** (crear, editar, desactivar, reactivar, resetear contraseña) registra un audit log en el tenant afectado, best-effort (un fallo ahí no revierte la acción principal). El **listado** (lectura) no audita nada — mismo criterio que ya tiene `UsersController.list` en `identity`, que tampoco lo hace.
- La conexión puntual al schema del tenant siempre se cierra en un `finally`, haya éxito o error.

---

## Task 1: Helpers compartidos — conexión puntual al schema y auditoría

**Files:**
- Create: `apps/api/src/modules/platform/infrastructure/tenant-schema-connection.ts`
- Create: `apps/api/src/modules/platform/infrastructure/record-platform-audit.ts`
- Create: `apps/api/src/modules/platform/infrastructure/record-platform-audit.spec.ts`

**Interfaces:**
- Produces: `withTenantSchemaConnection<T>(schemaName: string, fn: (dataSource: DataSource) => Promise<T>): Promise<T>`, `recordPlatformAudit(dataSource: DataSource, action: string, subject: string, resourceId: string | null, platformAdmin: PlatformJwtPayload): Promise<void>` — usados por las Tasks 2-6.

- [ ] **Step 1: Implementar `withTenantSchemaConnection`**

Crear `apps/api/src/modules/platform/infrastructure/tenant-schema-connection.ts`:

```ts
import { DataSource } from 'typeorm';
import { tenantSchemaOptions } from '../../../core/database/tenant.datasource';

/**
 * Abre una conexión puntual al schema de un tenant elegido por el
 * superadmin — mismo mecanismo que `SchemaProvisionerAdapter` usa para
 * migrar, generalizado para abrir/cerrar una conexión por acción en vez
 * de por migración. Nunca usa `TENANT_DATA_SOURCE` (esa resuelve el
 * tenant por el subdominio de la request actual, que en una request de
 * `/platform` no es el tenant que se quiere gestionar).
 */
export async function withTenantSchemaConnection<T>(
  schemaName: string,
  fn: (dataSource: DataSource) => Promise<T>,
): Promise<T> {
  const dataSource = new DataSource(tenantSchemaOptions(schemaName));
  await dataSource.initialize();
  try {
    return await fn(dataSource);
  } finally {
    await dataSource.destroy();
  }
}
```

- [ ] **Step 2: Escribir el test que falla para `recordPlatformAudit`**

Crear `apps/api/src/modules/platform/infrastructure/record-platform-audit.spec.ts`:

```ts
import { DataSource } from 'typeorm';
import { recordPlatformAudit } from './record-platform-audit';
import { TypeOrmAuditLogRepository } from '../../audit/infrastructure/repositories/typeorm-audit-log.repository';
import { PlatformJwtPayload } from '../../../core/auth/platform-jwt-payload.interface';

jest.mock('../../audit/infrastructure/repositories/typeorm-audit-log.repository');

describe('recordPlatformAudit', () => {
  const platformAdmin: PlatformJwtPayload = { sub: 'admin-1', email: 'super@eduapp.test', scope: 'platform' };
  const fakeDataSource = {} as DataSource;

  beforeEach(() => jest.clearAllMocks());

  it('registra el audit log con el actor prefijado como platform-admin', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    (TypeOrmAuditLogRepository as jest.Mock).mockImplementation(() => ({ record }));

    await recordPlatformAudit(fakeDataSource, 'create', 'User', 'user-1', platformAdmin);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'platform-admin:admin-1',
        actorEmail: 'super@eduapp.test',
        resourceId: 'user-1',
        success: true,
        kind: 'write',
      }),
    );
  });

  it('no interrumpe si falla el registro de auditoría (best-effort)', async () => {
    const record = jest.fn().mockRejectedValue(new Error('db down'));
    (TypeOrmAuditLogRepository as jest.Mock).mockImplementation(() => ({ record }));

    await expect(
      recordPlatformAudit(fakeDataSource, 'create', 'User', 'user-1', platformAdmin),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest record-platform-audit.spec.ts`
Expected: FAIL — el módulo `./record-platform-audit` no existe.

- [ ] **Step 4: Implementar `recordPlatformAudit`**

Crear `apps/api/src/modules/platform/infrastructure/record-platform-audit.ts`:

```ts
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmAuditLogRepository } from '../../audit/infrastructure/repositories/typeorm-audit-log.repository';
import { PlatformJwtPayload } from '../../../core/auth/platform-jwt-payload.interface';

const logger = new Logger('PlatformAudit');

/**
 * Best-effort: se llama DESPUÉS de que la acción principal ya se guardó
 * con éxito. Si el insert de auditoría falla, se loguea y se sigue — no
 * tiene sentido revertir una escritura que ya está confirmada por un
 * problema al registrar quién la hizo (mismo criterio que ya usa el
 * sistema, ej. `notify-new-grade.service.ts`).
 */
export async function recordPlatformAudit(
  dataSource: DataSource,
  action: string,
  subject: string,
  resourceId: string | null,
  platformAdmin: PlatformJwtPayload,
): Promise<void> {
  try {
    const auditLogs = new TypeOrmAuditLogRepository(dataSource);
    await auditLogs.record({
      actorId: `platform-admin:${platformAdmin.sub}`,
      actorEmail: platformAdmin.email,
      actorRoles: ['platform_admin'],
      method: action,
      route: `platform/tenants/:tenantId/users (${subject})`,
      resourceId,
      statusCode: 200,
      success: true,
      kind: 'write',
      ipAddress: null,
    });
  } catch (err) {
    logger.warn(`No se pudo registrar la auditoría de una acción de plataforma: ${(err as Error).message}`);
  }
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest record-platform-audit.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/platform/infrastructure/tenant-schema-connection.ts \
  apps/api/src/modules/platform/infrastructure/record-platform-audit.ts \
  apps/api/src/modules/platform/infrastructure/record-platform-audit.spec.ts
git commit -m "feat(platform): agregar helpers de conexión puntual a schema y auditoría"
```

---

## Task 2: `PlatformCreateTenantUserUseCase` y `PlatformListTenantUsersUseCase`

Estos dos no necesitan la identidad sintética (ni `CreateUserUseCase` ni `ListUsersUseCase` chequean rol internamente). `ListUsersUseCase` tampoco audita — es una lectura.

**Files:**
- Create: `apps/api/src/modules/platform/application/use-cases/platform-create-tenant-user.use-case.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-create-tenant-user.use-case.spec.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-list-tenant-users.use-case.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-list-tenant-users.use-case.spec.ts`

**Interfaces:**
- Consumes: `withTenantSchemaConnection`, `recordPlatformAudit` (Task 1); `TenantRepositoryPort.findById` (existente); `CreateUserUseCase`/`ListUsersUseCase` de `identity` (existentes, sin cambios).
- Produces: `PlatformCreateTenantUserUseCase.execute(tenantId, input: CreateUserInput, platformAdmin: PlatformJwtPayload): Promise<User>`, `PlatformListTenantUsersUseCase.execute(tenantId, role?, page?, pageSize?, search?): Promise<User[] | PaginatedResult<User>>` — usados por la Task 5 (controlador).

- [ ] **Step 1: Escribir los tests que fallan**

Crear `apps/api/src/modules/platform/application/use-cases/platform-create-tenant-user.use-case.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { PlatformCreateTenantUserUseCase } from './platform-create-tenant-user.use-case';
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

describe('PlatformCreateTenantUserUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(),
    findBySubdomain: jest.fn(),
    findByCustomDomain: jest.fn(),
    findAll: jest.fn(),
    existsBySubdomain: jest.fn(),
    save: jest.fn(),
  };
  const useCase = new PlatformCreateTenantUserUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const platformAdmin: PlatformJwtPayload = { sub: 'admin-1', email: 'super@eduapp.test', scope: 'platform' };
  const input = { email: 'nuevo@santateresa.test', password: 'Demo12345!', firstName: 'Ana', lastName: 'Admin', roles: ['admin_institucion' as const] };

  const fakeUserRepo = { findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), findById: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmUserRepository as jest.Mock).mockImplementation(() => fakeUserRepo);
    fakeUserRepo.findByEmail.mockResolvedValue(null);
    fakeUserRepo.findByDocumentNumber.mockResolvedValue(null);
    fakeUserRepo.save.mockResolvedValue(undefined);
  });

  it('rechaza si el tenant no existe, sin intentar abrir ninguna conexión', async () => {
    tenants.findById.mockResolvedValue(null);

    await expect(useCase.execute('tenant-x', input, platformAdmin)).rejects.toThrow(NotFoundException);
    expect(withTenantSchemaConnection).not.toHaveBeenCalled();
  });

  it('crea el usuario contra el schema del tenant elegido y audita la acción', async () => {
    const result = await useCase.execute('tenant-1', input, platformAdmin);

    expect(withTenantSchemaConnection).toHaveBeenCalledWith('tenant_santateresa', expect.any(Function));
    expect(result).toBeInstanceOf(User);
    expect(result.email).toBe(input.email);
    expect(fakeUserRepo.save).toHaveBeenCalledTimes(1);
    expect(recordPlatformAudit).toHaveBeenCalledWith(
      fakeDataSource,
      'create',
      'User',
      result.id,
      platformAdmin,
    );
  });
});
```

Crear `apps/api/src/modules/platform/application/use-cases/platform-list-tenant-users.use-case.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { PlatformListTenantUsersUseCase } from './platform-list-tenant-users.use-case';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';

jest.mock('../../infrastructure/tenant-schema-connection');
jest.mock('../../infrastructure/record-platform-audit');
jest.mock('../../../identity/infrastructure/repositories/typeorm-user.repository');

describe('PlatformListTenantUsersUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(),
    findBySubdomain: jest.fn(),
    findByCustomDomain: jest.fn(),
    findAll: jest.fn(),
    existsBySubdomain: jest.fn(),
    save: jest.fn(),
  };
  const useCase = new PlatformListTenantUsersUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const fakeUser = new User('user-1', 'a@a.com', 'hash', 'Ana', 'Admin', ['admin_institucion'], 'active', 0, null, null, null, null, null);
  const fakeUserRepo = { findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), findById: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmUserRepository as jest.Mock).mockImplementation(() => fakeUserRepo);
    fakeUserRepo.findAll.mockResolvedValue({ items: [fakeUser], total: 1 });
  });

  it('rechaza si el tenant no existe', async () => {
    tenants.findById.mockResolvedValue(null);
    await expect(useCase.execute('tenant-x')).rejects.toThrow(NotFoundException);
  });

  it('lista los usuarios del schema del tenant elegido sin auditar (es una lectura)', async () => {
    const result = await useCase.execute('tenant-1');

    expect(withTenantSchemaConnection).toHaveBeenCalledWith('tenant_santateresa', expect.any(Function));
    expect(result).toEqual([fakeUser]);
    expect(recordPlatformAudit).not.toHaveBeenCalled();
  });

  it('pagina cuando se pasan page/pageSize', async () => {
    const result = await useCase.execute('tenant-1', undefined, 1, 25);

    expect(fakeUserRepo.findAll).toHaveBeenCalledWith(undefined, { page: 1, pageSize: 25 });
    expect(result).toEqual({ items: [fakeUser], total: 1, page: 1, pageSize: 25 });
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd apps/api && npx jest platform-create-tenant-user.use-case.spec.ts platform-list-tenant-users.use-case.spec.ts`
Expected: FAIL — los módulos no existen.

- [ ] **Step 3: Implementar `PlatformCreateTenantUserUseCase`**

Crear `apps/api/src/modules/platform/application/use-cases/platform-create-tenant-user.use-case.ts`:

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { BcryptPasswordHasher } from '../../../../core/security/bcrypt-password-hasher';
import { CreateUserUseCase, CreateUserInput } from '../../../identity/application/use-cases/create-user.use-case';
import { User } from '../../../identity/domain/entities/user.entity';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

@Injectable()
export class PlatformCreateTenantUserUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(tenantId: string, input: CreateUserInput, platformAdmin: PlatformJwtPayload): Promise<User> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      const hasher = new BcryptPasswordHasher();
      const user = await new CreateUserUseCase(users, hasher).execute(input);
      await recordPlatformAudit(dataSource, 'create', 'User', user.id, platformAdmin);
      return user;
    });
  }
}
```

- [ ] **Step 4: Implementar `PlatformListTenantUsersUseCase`**

Crear `apps/api/src/modules/platform/application/use-cases/platform-list-tenant-users.use-case.ts`:

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { ListUsersUseCase } from '../../../identity/application/use-cases/list-users.use-case';
import { User, UserRole } from '../../../identity/domain/entities/user.entity';
import { PaginatedResult } from '../../../../core/http/pagination.dto';

@Injectable()
export class PlatformListTenantUsersUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(
    tenantId: string,
    role?: UserRole,
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<User[] | PaginatedResult<User>> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      return new ListUsersUseCase(users).execute(role, page, pageSize, search);
    });
  }
}
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `cd apps/api && npx jest platform-create-tenant-user.use-case.spec.ts platform-list-tenant-users.use-case.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/platform/application/use-cases/platform-create-tenant-user.use-case.ts \
  apps/api/src/modules/platform/application/use-cases/platform-create-tenant-user.use-case.spec.ts \
  apps/api/src/modules/platform/application/use-cases/platform-list-tenant-users.use-case.ts \
  apps/api/src/modules/platform/application/use-cases/platform-list-tenant-users.use-case.spec.ts
git commit -m "feat(platform): agregar PlatformCreateTenantUserUseCase y PlatformListTenantUsersUseCase"
```

---

## Task 3: `PlatformEditTenantUserUseCase`, `PlatformDeactivateTenantUserUseCase`, `PlatformReactivateTenantUserUseCase`

Estos tres SÍ necesitan la identidad sintética (`EditUserUseCase`/`DeactivateUserUseCase`/`ReactivateUserUseCase` chequean rol internamente).

**Files:**
- Create: `apps/api/src/modules/platform/infrastructure/build-synthetic-tenant-actor.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-edit-tenant-user.use-case.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-edit-tenant-user.use-case.spec.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-deactivate-tenant-user.use-case.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-deactivate-tenant-user.use-case.spec.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-reactivate-tenant-user.use-case.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-reactivate-tenant-user.use-case.spec.ts`

**Interfaces:**
- Consumes: `withTenantSchemaConnection`, `recordPlatformAudit` (Task 1); `EditUserUseCase`/`DeactivateUserUseCase`/`ReactivateUserUseCase` de `identity` (existentes).
- Produces: `buildSyntheticTenantActor(platformAdmin, schemaName): JwtPayload`, usado también por Task 4. `PlatformEditTenantUserUseCase.execute(tenantId, userId, input: EditUserInput, platformAdmin): Promise<User>`, `PlatformDeactivateTenantUserUseCase.execute(tenantId, userId, platformAdmin): Promise<User>`, `PlatformReactivateTenantUserUseCase.execute(tenantId, userId, platformAdmin): Promise<User>` — usados por la Task 5.

- [ ] **Step 1: Implementar el helper de identidad sintética (sin test propio — es trivial y se ejerce indirectamente en los tests de abajo)**

Crear `apps/api/src/modules/platform/infrastructure/build-synthetic-tenant-actor.ts`:

```ts
import { JwtPayload } from '../../../core/auth/jwt-payload.interface';
import { PlatformJwtPayload } from '../../../core/auth/platform-jwt-payload.interface';

/**
 * Identidad en memoria para satisfacer el chequeo de rol interno de
 * `EditUserUseCase`/`DeactivateUserUseCase`/`ReactivateUserUseCase` —
 * nunca se firma como JWT real, nunca se persiste, nunca sale del
 * servidor. El prefijo `platform-admin:` en `sub` es intencional: si
 * alguna vez aparece en un log, queda claro que no es un usuario real
 * de ese tenant.
 */
export function buildSyntheticTenantActor(platformAdmin: PlatformJwtPayload, schemaName: string): JwtPayload {
  return {
    sub: `platform-admin:${platformAdmin.sub}`,
    email: platformAdmin.email,
    roles: ['admin_institucion'],
    tenantId: schemaName,
  };
}
```

- [ ] **Step 2: Escribir los tests que fallan**

Crear `apps/api/src/modules/platform/application/use-cases/platform-edit-tenant-user.use-case.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { PlatformEditTenantUserUseCase } from './platform-edit-tenant-user.use-case';
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

describe('PlatformEditTenantUserUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };
  const useCase = new PlatformEditTenantUserUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const platformAdmin: PlatformJwtPayload = { sub: 'admin-1', email: 'super@eduapp.test', scope: 'platform' };
  const existingUser = new User('user-1', 'old@santateresa.test', 'hash', 'Ana', 'Admin', ['admin_institucion'], 'active', 0, null, null, null, null, null);
  const input = { email: 'nuevo@santateresa.test', firstName: 'Ana', lastName: 'Admin', roles: ['admin_institucion' as const] };

  const fakeUserRepo = { findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), findById: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmUserRepository as jest.Mock).mockImplementation(() => fakeUserRepo);
    fakeUserRepo.findById.mockResolvedValue(existingUser);
    fakeUserRepo.findByEmail.mockResolvedValue(null);
    fakeUserRepo.save.mockResolvedValue(undefined);
  });

  it('rechaza si el tenant no existe', async () => {
    tenants.findById.mockResolvedValue(null);
    await expect(useCase.execute('tenant-x', 'user-1', input, platformAdmin)).rejects.toThrow(NotFoundException);
  });

  it('edita el usuario contra el schema del tenant elegido y audita la acción', async () => {
    const result = await useCase.execute('tenant-1', 'user-1', input, platformAdmin);

    expect(result.email).toBe(input.email);
    expect(recordPlatformAudit).toHaveBeenCalledWith(fakeDataSource, 'edit', 'User', 'user-1', platformAdmin);
  });
});
```

Crear `apps/api/src/modules/platform/application/use-cases/platform-deactivate-tenant-user.use-case.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { PlatformDeactivateTenantUserUseCase } from './platform-deactivate-tenant-user.use-case';
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

describe('PlatformDeactivateTenantUserUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };
  const useCase = new PlatformDeactivateTenantUserUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const platformAdmin: PlatformJwtPayload = { sub: 'admin-1', email: 'super@eduapp.test', scope: 'platform' };
  const existingUser = new User('user-1', 'a@santateresa.test', 'hash', 'Ana', 'Admin', ['docente'], 'active', 0, null, null, null, null, null);

  const fakeUserRepo = { findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), findById: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmUserRepository as jest.Mock).mockImplementation(() => fakeUserRepo);
    fakeUserRepo.findById.mockResolvedValue(existingUser);
    fakeUserRepo.save.mockResolvedValue(undefined);
  });

  it('rechaza si el tenant no existe', async () => {
    tenants.findById.mockResolvedValue(null);
    await expect(useCase.execute('tenant-x', 'user-1', platformAdmin)).rejects.toThrow(NotFoundException);
  });

  it('desactiva el usuario contra el schema del tenant elegido y audita la acción', async () => {
    const result = await useCase.execute('tenant-1', 'user-1', platformAdmin);

    expect(result.status).toBe('suspended');
    expect(recordPlatformAudit).toHaveBeenCalledWith(fakeDataSource, 'deactivate', 'User', 'user-1', platformAdmin);
  });
});
```

Crear `apps/api/src/modules/platform/application/use-cases/platform-reactivate-tenant-user.use-case.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { PlatformReactivateTenantUserUseCase } from './platform-reactivate-tenant-user.use-case';
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

describe('PlatformReactivateTenantUserUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };
  const useCase = new PlatformReactivateTenantUserUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const platformAdmin: PlatformJwtPayload = { sub: 'admin-1', email: 'super@eduapp.test', scope: 'platform' };
  const existingUser = new User('user-1', 'a@santateresa.test', 'hash', 'Ana', 'Admin', ['docente'], 'suspended', 0, null, null, null, null, null);

  const fakeUserRepo = { findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), findById: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmUserRepository as jest.Mock).mockImplementation(() => fakeUserRepo);
    fakeUserRepo.findById.mockResolvedValue(existingUser);
    fakeUserRepo.save.mockResolvedValue(undefined);
  });

  it('rechaza si el tenant no existe', async () => {
    tenants.findById.mockResolvedValue(null);
    await expect(useCase.execute('tenant-x', 'user-1', platformAdmin)).rejects.toThrow(NotFoundException);
  });

  it('reactiva el usuario contra el schema del tenant elegido y audita la acción', async () => {
    const result = await useCase.execute('tenant-1', 'user-1', platformAdmin);

    expect(result.status).toBe('active');
    expect(recordPlatformAudit).toHaveBeenCalledWith(fakeDataSource, 'reactivate', 'User', 'user-1', platformAdmin);
  });
});
```

- [ ] **Step 3: Correr los tests y verificar que fallan**

Run: `cd apps/api && npx jest platform-edit-tenant-user platform-deactivate-tenant-user platform-reactivate-tenant-user`
Expected: FAIL — los módulos no existen.

- [ ] **Step 4: Implementar los tres use-cases**

Crear `apps/api/src/modules/platform/application/use-cases/platform-edit-tenant-user.use-case.ts`:

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { buildSyntheticTenantActor } from '../../infrastructure/build-synthetic-tenant-actor';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { EditUserUseCase, EditUserInput } from '../../../identity/application/use-cases/edit-user.use-case';
import { User } from '../../../identity/domain/entities/user.entity';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

@Injectable()
export class PlatformEditTenantUserUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(
    tenantId: string,
    userId: string,
    input: EditUserInput,
    platformAdmin: PlatformJwtPayload,
  ): Promise<User> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      const actor = buildSyntheticTenantActor(platformAdmin, tenant.schemaName);
      const user = await new EditUserUseCase(users).execute(userId, input, actor);
      await recordPlatformAudit(dataSource, 'edit', 'User', user.id, platformAdmin);
      return user;
    });
  }
}
```

Crear `apps/api/src/modules/platform/application/use-cases/platform-deactivate-tenant-user.use-case.ts`:

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { buildSyntheticTenantActor } from '../../infrastructure/build-synthetic-tenant-actor';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { DeactivateUserUseCase } from '../../../identity/application/use-cases/deactivate-user.use-case';
import { User } from '../../../identity/domain/entities/user.entity';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

@Injectable()
export class PlatformDeactivateTenantUserUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(tenantId: string, userId: string, platformAdmin: PlatformJwtPayload): Promise<User> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      const actor = buildSyntheticTenantActor(platformAdmin, tenant.schemaName);
      const user = await new DeactivateUserUseCase(users).execute(userId, actor);
      await recordPlatformAudit(dataSource, 'deactivate', 'User', user.id, platformAdmin);
      return user;
    });
  }
}
```

Crear `apps/api/src/modules/platform/application/use-cases/platform-reactivate-tenant-user.use-case.ts`:

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { buildSyntheticTenantActor } from '../../infrastructure/build-synthetic-tenant-actor';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { ReactivateUserUseCase } from '../../../identity/application/use-cases/reactivate-user.use-case';
import { User } from '../../../identity/domain/entities/user.entity';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

@Injectable()
export class PlatformReactivateTenantUserUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(tenantId: string, userId: string, platformAdmin: PlatformJwtPayload): Promise<User> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      const actor = buildSyntheticTenantActor(platformAdmin, tenant.schemaName);
      const user = await new ReactivateUserUseCase(users).execute(userId, actor);
      await recordPlatformAudit(dataSource, 'reactivate', 'User', user.id, platformAdmin);
      return user;
    });
  }
}
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `cd apps/api && npx jest platform-edit-tenant-user platform-deactivate-tenant-user platform-reactivate-tenant-user`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/platform/infrastructure/build-synthetic-tenant-actor.ts \
  apps/api/src/modules/platform/application/use-cases/platform-edit-tenant-user.use-case.ts \
  apps/api/src/modules/platform/application/use-cases/platform-edit-tenant-user.use-case.spec.ts \
  apps/api/src/modules/platform/application/use-cases/platform-deactivate-tenant-user.use-case.ts \
  apps/api/src/modules/platform/application/use-cases/platform-deactivate-tenant-user.use-case.spec.ts \
  apps/api/src/modules/platform/application/use-cases/platform-reactivate-tenant-user.use-case.ts \
  apps/api/src/modules/platform/application/use-cases/platform-reactivate-tenant-user.use-case.spec.ts
git commit -m "feat(platform): agregar edit/deactivate/reactivate de usuarios por tenant"
```

---

## Task 4: `PlatformResetTenantUserPasswordUseCase`

**Files:**
- Create: `apps/api/src/modules/platform/application/use-cases/platform-reset-tenant-user-password.use-case.ts`
- Create: `apps/api/src/modules/platform/application/use-cases/platform-reset-tenant-user-password.use-case.spec.ts`

**Interfaces:**
- Consumes: `withTenantSchemaConnection`, `recordPlatformAudit` (Task 1); `ResetUserPasswordUseCase` de `identity` (existente, no necesita actor).
- Produces: `PlatformResetTenantUserPasswordUseCase.execute(tenantId, userId, platformAdmin): Promise<{ temporaryPassword: string }>` — usado por la Task 5.

- [ ] **Step 1: Escribir el test que falla**

Crear `apps/api/src/modules/platform/application/use-cases/platform-reset-tenant-user-password.use-case.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { PlatformResetTenantUserPasswordUseCase } from './platform-reset-tenant-user-password.use-case';
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

describe('PlatformResetTenantUserPasswordUseCase', () => {
  const tenants: jest.Mocked<TenantRepositoryPort> = {
    findById: jest.fn(), findBySubdomain: jest.fn(), findByCustomDomain: jest.fn(),
    findAll: jest.fn(), existsBySubdomain: jest.fn(), save: jest.fn(),
  };
  const useCase = new PlatformResetTenantUserPasswordUseCase(tenants);

  const tenant = new Tenant('tenant-1', 'Santa Teresa', 'santateresa', null, 'tenant_santateresa', 'active', []);
  const platformAdmin: PlatformJwtPayload = { sub: 'admin-1', email: 'super@eduapp.test', scope: 'platform' };
  const existingUser = new User('user-1', 'a@santateresa.test', 'hash', 'Ana', 'Admin', ['docente'], 'active', 0, null, null, null, null, null);

  const fakeUserRepo = { findByEmail: jest.fn(), findByDocumentNumber: jest.fn(), findById: jest.fn(), findAll: jest.fn(), save: jest.fn() };
  const fakeDataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.findById.mockResolvedValue(tenant);
    (withTenantSchemaConnection as jest.Mock).mockImplementation((_schemaName, fn) => fn(fakeDataSource));
    (TypeOrmUserRepository as jest.Mock).mockImplementation(() => fakeUserRepo);
    fakeUserRepo.findById.mockResolvedValue(existingUser);
    fakeUserRepo.save.mockResolvedValue(undefined);
  });

  it('rechaza si el tenant no existe', async () => {
    tenants.findById.mockResolvedValue(null);
    await expect(useCase.execute('tenant-x', 'user-1', platformAdmin)).rejects.toThrow(NotFoundException);
  });

  it('resetea la contraseña contra el schema del tenant elegido y audita la acción', async () => {
    const result = await useCase.execute('tenant-1', 'user-1', platformAdmin);

    expect(result.temporaryPassword).toHaveLength(12);
    expect(recordPlatformAudit).toHaveBeenCalledWith(fakeDataSource, 'reset-password', 'User', 'user-1', platformAdmin);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest platform-reset-tenant-user-password.use-case.spec.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

Crear `apps/api/src/modules/platform/application/use-cases/platform-reset-tenant-user-password.use-case.ts`:

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { BcryptPasswordHasher } from '../../../../core/security/bcrypt-password-hasher';
import {
  ResetUserPasswordUseCase,
  ResetUserPasswordOutput,
} from '../../../identity/application/use-cases/reset-user-password.use-case';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

@Injectable()
export class PlatformResetTenantUserPasswordUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(
    tenantId: string,
    userId: string,
    platformAdmin: PlatformJwtPayload,
  ): Promise<ResetUserPasswordOutput> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      const hasher = new BcryptPasswordHasher();
      const result = await new ResetUserPasswordUseCase(users, hasher).execute(userId);
      await recordPlatformAudit(dataSource, 'reset-password', 'User', userId, platformAdmin);
      return result;
    });
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest platform-reset-tenant-user-password.use-case.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Correr toda la suite de backend antes de seguir**

Run: `cd apps/api && npm test`
Expected: PASS, sin regresiones.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/platform/application/use-cases/platform-reset-tenant-user-password.use-case.ts \
  apps/api/src/modules/platform/application/use-cases/platform-reset-tenant-user-password.use-case.spec.ts
git commit -m "feat(platform): agregar PlatformResetTenantUserPasswordUseCase"
```

---

## Task 5: Controlador y wiring del módulo

**Files:**
- Create: `apps/api/src/modules/platform/interface/controllers/platform-tenant-users.controller.ts`
- Modify: `apps/api/src/modules/platform/platform.module.ts`

**Interfaces:**
- Consumes: los 6 use-cases de las Tasks 2-4; `CreateUserDto`/`EditUserDto`/`ListUsersQueryDto` de `identity/interface/dtos/` (existentes, reusados tal cual).
- Produces: rutas HTTP `POST|GET /platform/tenants/:tenantId/users`, `PATCH /platform/tenants/:tenantId/users/:id[/reset-password|/deactivate|/reactivate]`.

- [ ] **Step 1: Crear el controlador**

Crear `apps/api/src/modules/platform/interface/controllers/platform-tenant-users.controller.ts`:

```ts
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../../../core/auth/public.decorator';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { PlatformCreateTenantUserUseCase } from '../../application/use-cases/platform-create-tenant-user.use-case';
import { PlatformListTenantUsersUseCase } from '../../application/use-cases/platform-list-tenant-users.use-case';
import { PlatformEditTenantUserUseCase } from '../../application/use-cases/platform-edit-tenant-user.use-case';
import { PlatformDeactivateTenantUserUseCase } from '../../application/use-cases/platform-deactivate-tenant-user.use-case';
import { PlatformReactivateTenantUserUseCase } from '../../application/use-cases/platform-reactivate-tenant-user.use-case';
import { PlatformResetTenantUserPasswordUseCase } from '../../application/use-cases/platform-reset-tenant-user-password.use-case';
import { CreateUserDto } from '../../../identity/interface/dtos/create-user.dto';
import { EditUserDto } from '../../../identity/interface/dtos/edit-user.dto';
import { ListUsersQueryDto } from '../../../identity/interface/dtos/list-users-query.dto';
import { User } from '../../../identity/domain/entities/user.entity';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

/**
 * Mismo criterio de protección que `TenantsController`: sin JWT de tenant
 * (no hay ninguno resuelto en rutas de `/platform`), `PlatformAdminGuard`
 * en su lugar.
 */
function toResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    status: user.status,
    birthDate: user.birthDate,
    documentType: user.documentType,
    documentNumber: user.documentNumber,
    address: user.address,
  };
}

@Controller('platform/tenants/:tenantId/users')
@Public()
@UseGuards(PlatformAdminGuard)
export class PlatformTenantUsersController {
  constructor(
    private readonly createUser: PlatformCreateTenantUserUseCase,
    private readonly listUsers: PlatformListTenantUsersUseCase,
    private readonly editUser: PlatformEditTenantUserUseCase,
    private readonly deactivateUser: PlatformDeactivateTenantUserUseCase,
    private readonly reactivateUser: PlatformReactivateTenantUserUseCase,
    private readonly resetPassword: PlatformResetTenantUserPasswordUseCase,
  ) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateUserDto,
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
  ) {
    const user = await this.createUser.execute(tenantId, dto, req.platformAdmin);
    return toResponse(user);
  }

  @Get()
  async list(@Param('tenantId') tenantId: string, @Query() query: ListUsersQueryDto) {
    const result = await this.listUsers.execute(tenantId, query.role, query.page, query.pageSize, query.search);
    if (Array.isArray(result)) return result.map(toResponse);
    return { ...result, items: result.items.map(toResponse) };
  }

  @Patch(':id')
  async edit(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: EditUserDto,
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
  ) {
    const user = await this.editUser.execute(tenantId, id, dto, req.platformAdmin);
    return toResponse(user);
  }

  @Patch(':id/reset-password')
  async resetPasswordRoute(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
  ) {
    return this.resetPassword.execute(tenantId, id, req.platformAdmin);
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
  ) {
    const user = await this.deactivateUser.execute(tenantId, id, req.platformAdmin);
    return toResponse(user);
  }

  @Patch(':id/reactivate')
  async reactivate(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
  ) {
    const user = await this.reactivateUser.execute(tenantId, id, req.platformAdmin);
    return toResponse(user);
  }
}
```

- [ ] **Step 2: Registrar todo en `platform.module.ts`**

Agregar los imports:

```ts
import { PlatformTenantUsersController } from './interface/controllers/platform-tenant-users.controller';
import { PlatformCreateTenantUserUseCase } from './application/use-cases/platform-create-tenant-user.use-case';
import { PlatformListTenantUsersUseCase } from './application/use-cases/platform-list-tenant-users.use-case';
import { PlatformEditTenantUserUseCase } from './application/use-cases/platform-edit-tenant-user.use-case';
import { PlatformDeactivateTenantUserUseCase } from './application/use-cases/platform-deactivate-tenant-user.use-case';
import { PlatformReactivateTenantUserUseCase } from './application/use-cases/platform-reactivate-tenant-user.use-case';
import { PlatformResetTenantUserPasswordUseCase } from './application/use-cases/platform-reset-tenant-user-password.use-case';
```

Agregar `PlatformTenantUsersController` al array `controllers`, y los seis use-cases al array `providers` (junto a `AuthenticatePlatformAdminUseCase`, etc.).

- [ ] **Step 3: Verificar que compila**

Run: `cd apps/api && npm run build`
Expected: compila sin errores.

- [ ] **Step 4: Correr toda la suite de backend**

Run: `cd apps/api && npm test`
Expected: PASS, sin regresiones.

- [ ] **Step 5: Verificar a mano contra la base de desarrollo**

Con el backend corriendo, loguearse como superadmin de plataforma y ejercitar el flujo completo contra el tenant "Santa Teresa" (`tenant_santateresa`, ya existe de pruebas anteriores):

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/platform/auth/login -H 'Content-Type: application/json' -d '{"email":"superadmin@eduapp.test","password":"Super12345!"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")
TENANT_ID=$(curl -s http://localhost:3001/platform/tenants -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys; print([t['id'] for t in json.load(sys.stdin) if t['subdomain']=='santateresa'][0])")

# Crear el primer admin del tenant
curl -s -X POST "http://localhost:3001/platform/tenants/$TENANT_ID/users" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"admin2@santateresa.test","password":"Demo12345!","firstName":"Admin","lastName":"Dos","roles":["admin_institucion"]}'

# Listar usuarios del tenant
curl -s "http://localhost:3001/platform/tenants/$TENANT_ID/users" -H "Authorization: Bearer $TOKEN"
```

Expected: el POST devuelve el usuario creado (201/200 con el JSON del usuario), el GET lo lista. Confirmar en la base que el usuario quedó en el schema correcto:

```bash
PGPASSWORD=eduapp psql -h localhost -p 5435 -U eduapp -d eduapp -c "SELECT email, roles, status FROM tenant_santateresa.users;"
PGPASSWORD=eduapp psql -h localhost -p 5435 -U eduapp -d eduapp -c "SELECT actor_id, method, resource_id FROM tenant_santateresa.audit_logs ORDER BY created_at DESC LIMIT 1;"
```

Expected: el usuario aparece en `tenant_santateresa.users`, y el último `audit_logs` tiene `actor_id` empezando con `platform-admin:`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/platform/interface/controllers/platform-tenant-users.controller.ts \
  apps/api/src/modules/platform/platform.module.ts
git commit -m "feat(platform): agregar endpoints de gestión de usuarios por tenant"
```

---

## Task 6: Frontend — hooks y rutas BFF

**Files:**
- Create: `apps/web/src/features/platform-tenant-users/use-platform-tenant-users.ts`
- Create: `apps/web/src/app/api/platform/tenants/[id]/users/route.ts`
- Create: `apps/web/src/app/api/platform/tenants/[id]/users/[userId]/route.ts`
- Create: `apps/web/src/app/api/platform/tenants/[id]/users/[userId]/reset-password/route.ts`
- Create: `apps/web/src/app/api/platform/tenants/[id]/users/[userId]/deactivate/route.ts`
- Create: `apps/web/src/app/api/platform/tenants/[id]/users/[userId]/reactivate/route.ts`

**Interfaces:**
- Consumes: `platformApiFetch` (existente, `lib/platform-api.ts`); `TenantUser` de `@eduapp/shared-types` (existente, reusado tal cual — misma forma que ya usa `features/users`).
- Produces: `usePlatformTenantUsers`, `useCreatePlatformTenantUser`, `useEditPlatformTenantUser`, `useResetPlatformTenantUserPassword`, `useDeactivatePlatformTenantUser`, `useReactivatePlatformTenantUser` — usados por la Task 7.

- [ ] **Step 1: Rutas BFF**

Crear `apps/web/src/app/api/platform/tenants/[id]/users/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';
import type { PaginatedResult, TenantUser } from '@eduapp/shared-types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const qs = req.nextUrl.searchParams.toString();
  const result = await platformApiFetch<PaginatedResult<TenantUser>>(
    `/platform/tenants/${params.id}/users${qs ? `?${qs}` : ''}`,
  );
  if (result === null) return NextResponse.json({ message: 'No se pudieron cargar los usuarios' }, { status: 400 });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const user = await platformApiFetch<TenantUser>(`/platform/tenants/${params.id}/users`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (user === null) return NextResponse.json({ message: 'No se pudo crear el usuario' }, { status: 400 });
  return NextResponse.json(user, { status: 201 });
}
```

Crear `apps/web/src/app/api/platform/tenants/[id]/users/[userId]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';
import type { TenantUser } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  const body = await req.json();
  const user = await platformApiFetch<TenantUser>(`/platform/tenants/${params.id}/users/${params.userId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (user === null) return NextResponse.json({ message: 'No se pudo editar el usuario' }, { status: 400 });
  return NextResponse.json(user);
}
```

Crear `apps/web/src/app/api/platform/tenants/[id]/users/[userId]/reset-password/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';

export async function PATCH(_req: Request, { params }: { params: { id: string; userId: string } }) {
  const result = await platformApiFetch<{ temporaryPassword: string }>(
    `/platform/tenants/${params.id}/users/${params.userId}/reset-password`,
    { method: 'PATCH' },
  );
  if (result === null) return NextResponse.json({ message: 'No se pudo resetear la contraseña' }, { status: 400 });
  return NextResponse.json(result);
}
```

Crear `apps/web/src/app/api/platform/tenants/[id]/users/[userId]/deactivate/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';
import type { TenantUser } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string; userId: string } }) {
  const user = await platformApiFetch<TenantUser>(
    `/platform/tenants/${params.id}/users/${params.userId}/deactivate`,
    { method: 'PATCH' },
  );
  if (user === null) return NextResponse.json({ message: 'No se pudo inactivar el usuario' }, { status: 400 });
  return NextResponse.json(user);
}
```

Crear `apps/web/src/app/api/platform/tenants/[id]/users/[userId]/reactivate/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';
import type { TenantUser } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string; userId: string } }) {
  const user = await platformApiFetch<TenantUser>(
    `/platform/tenants/${params.id}/users/${params.userId}/reactivate`,
    { method: 'PATCH' },
  );
  if (user === null) return NextResponse.json({ message: 'No se pudo reactivar el usuario' }, { status: 400 });
  return NextResponse.json(user);
}
```

- [ ] **Step 2: Hooks de React Query**

Crear `apps/web/src/features/platform-tenant-users/use-platform-tenant-users.ts`:

```ts
'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResult, TenantUser } from '@eduapp/shared-types';

export interface PlatformTenantUsersFilter {
  tenantId: string;
  page: number;
  pageSize: number;
  search?: string;
}

async function fetchPlatformTenantUsers(
  filter: PlatformTenantUsersFilter,
): Promise<PaginatedResult<TenantUser>> {
  const params = new URLSearchParams();
  params.set('page', String(filter.page));
  params.set('pageSize', String(filter.pageSize));
  if (filter.search) params.set('search', filter.search);

  const res = await fetch(`/api/platform/tenants/${filter.tenantId}/users?${params.toString()}`);
  if (!res.ok) throw new Error('No se pudieron cargar los usuarios');
  return res.json();
}

export function usePlatformTenantUsers(filter: PlatformTenantUsersFilter) {
  return useQuery({
    queryKey: ['platform-tenant-users', filter],
    queryFn: () => fetchPlatformTenantUsers(filter),
    placeholderData: keepPreviousData,
  });
}

export interface CreatePlatformTenantUserInput {
  tenantId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

async function createPlatformTenantUser({
  tenantId,
  ...input
}: CreatePlatformTenantUserInput): Promise<TenantUser> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo crear el usuario');
  }
  return res.json();
}

export function useCreatePlatformTenantUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlatformTenantUser,
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-users', { tenantId: variables.tenantId }] }),
  });
}

export interface EditPlatformTenantUserInput {
  tenantId: string;
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

async function editPlatformTenantUser({
  tenantId,
  id,
  ...input
}: EditPlatformTenantUserInput): Promise<TenantUser> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/users/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo editar el usuario');
  }
  return res.json();
}

export function useEditPlatformTenantUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editPlatformTenantUser,
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-users', { tenantId: variables.tenantId }] }),
  });
}

async function resetPlatformTenantUserPassword({
  tenantId,
  id,
}: {
  tenantId: string;
  id: string;
}): Promise<{ temporaryPassword: string }> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/users/${id}/reset-password`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo resetear la contraseña');
  return res.json();
}

export function useResetPlatformTenantUserPassword() {
  return useMutation({ mutationFn: resetPlatformTenantUserPassword });
}

async function deactivatePlatformTenantUser({
  tenantId,
  id,
}: {
  tenantId: string;
  id: string;
}): Promise<TenantUser> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/users/${id}/deactivate`, { method: 'PATCH' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo inactivar el usuario');
  }
  return res.json();
}

export function useDeactivatePlatformTenantUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivatePlatformTenantUser,
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-users', { tenantId: variables.tenantId }] }),
  });
}

async function reactivatePlatformTenantUser({
  tenantId,
  id,
}: {
  tenantId: string;
  id: string;
}): Promise<TenantUser> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/users/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo reactivar el usuario');
  }
  return res.json();
}

export function useReactivatePlatformTenantUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reactivatePlatformTenantUser,
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-users', { tenantId: variables.tenantId }] }),
  });
}
```

Nota: la query-key `['platform-tenant-users', { tenantId: variables.tenantId }]` no calza byte-a-byte con la key completa que usa `usePlatformTenantUsers` (que incluye `page`/`pageSize`/`search`) — React Query invalida por **prefijo parcial de objeto**, así que una invalidación con solo `{ tenantId }` sí alcanza a cualquier query cuya key sea `['platform-tenant-users', { tenantId, page, pageSize, ... }]`. No hace falta que coincida exacto.

- [ ] **Step 3: Verificar que el frontend compila**

Run: `cd apps/web && npm run build`
Expected: compila sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/platform-tenant-users/use-platform-tenant-users.ts \
  apps/web/src/app/api/platform/tenants/\[id\]/users/
git commit -m "feat(platform): agregar hooks y rutas BFF de usuarios por tenant"
```

---

## Task 7: Frontend — pestaña "Usuarios" en la página de la institución

**Files:**
- Create: `apps/web/src/features/platform-tenant-users/components/platform-tenant-users-list.tsx`
- Create: `apps/web/src/features/platform-tenant-users/components/create-platform-tenant-user-form.tsx`
- Create: `apps/web/src/features/platform-tenant-users/components/edit-platform-tenant-user-modal.tsx`
- Modify: `apps/web/src/app/platform/tenants/[id]/page.tsx`

**Interfaces:**
- Consumes: los 6 hooks de la Task 6; `TenantUser` de `@eduapp/shared-types`; componentes UI existentes (`Card`, `Input`, `Label`, `Button`, `Dialog`, `Pagination`, `LoadingState`, `ConfirmDialog`).

- [ ] **Step 1: Formulario de crear usuario**

Crear `apps/web/src/features/platform-tenant-users/components/create-platform-tenant-user-form.tsx`:

```tsx
'use client';

import { FormEvent, useState } from 'react';
import { useCreatePlatformTenantUser } from '../use-platform-tenant-users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ROLES = [
  { value: 'admin_institucion', label: 'Admin institución' },
  { value: 'directivo', label: 'Directivo' },
  { value: 'docente', label: 'Docente' },
  { value: 'secretaria', label: 'Secretaría' },
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'padre_tutor', label: 'Padre/tutor' },
];

export function CreatePlatformTenantUserForm({ tenantId }: { tenantId: string }) {
  const createUser = useCreatePlatformTenantUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('admin_institucion');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createUser.mutate(
      { tenantId, email, password, firstName, lastName, roles: [role] },
      {
        onSuccess: () => {
          setEmail('');
          setPassword('');
          setFirstName('');
          setLastName('');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="platformUserFirstName">Nombre</Label>
        <Input id="platformUserFirstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="platformUserLastName">Apellido</Label>
        <Input id="platformUserLastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="platformUserEmail">Email</Label>
        <Input
          id="platformUserEmail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="platformUserPassword">Contraseña</Label>
        <Input
          id="platformUserPassword"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="platformUserRole">Rol</Label>
        <select
          id="platformUserRole"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? 'Creando...' : 'Crear'}
      </Button>
      {createUser.isError && <p className="w-full text-sm text-destructive">{createUser.error.message}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Modal de editar**

Crear `apps/web/src/features/platform-tenant-users/components/edit-platform-tenant-user-modal.tsx`:

```tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useEditPlatformTenantUser } from '../use-platform-tenant-users';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TenantUser } from '@eduapp/shared-types';

const ROLES = [
  { value: 'admin_institucion', label: 'Admin institución' },
  { value: 'directivo', label: 'Directivo' },
  { value: 'docente', label: 'Docente' },
  { value: 'secretaria', label: 'Secretaría' },
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'padre_tutor', label: 'Padre/tutor' },
];

export function EditPlatformTenantUserModal({
  tenantId,
  user,
  onClose,
}: {
  tenantId: string;
  user: TenantUser | null;
  onClose: () => void;
}) {
  const editUser = useEditPlatformTenantUser();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('admin_institucion');

  useEffect(() => {
    if (!user) return;
    setEmail(user.email);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setRole(user.roles[0] ?? 'admin_institucion');
  }, [user]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    editUser.mutate(
      { tenantId, id: user.id, email, firstName, lastName, roles: [role] },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Dialog open={user !== null} onClose={onClose} title="Editar usuario">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="editPlatformUserFirstName">Nombre</Label>
            <Input
              id="editPlatformUserFirstName"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="editPlatformUserLastName">Apellido</Label>
            <Input
              id="editPlatformUserLastName"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="editPlatformUserEmail">Email</Label>
          <Input
            id="editPlatformUserEmail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="editPlatformUserRole">Rol</Label>
          <select
            id="editPlatformUserRole"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={editUser.isPending}>
            {editUser.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
        </div>
        {editUser.isError && <p className="text-sm text-destructive">{editUser.error.message}</p>}
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 3: Listado con acciones**

Crear `apps/web/src/features/platform-tenant-users/components/platform-tenant-users-list.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Ban, KeyRound, Pencil } from 'lucide-react';
import {
  usePlatformTenantUsers,
  useResetPlatformTenantUserPassword,
  useDeactivatePlatformTenantUser,
  useReactivatePlatformTenantUser,
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
  const [revealed, setRevealed] = useState<{ userId: string; password: string } | null>(null);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<TenantUser | null>(null);

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
    resetPassword.mutate(
      { tenantId, id: userId },
      { onSuccess: ({ temporaryPassword }) => setRevealed({ userId, password: temporaryPassword }) },
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
                {user.status === 'suspended' ? (
                  <button
                    type="button"
                    className="text-xs text-primary underline hover:text-primary/80"
                    disabled={reactivateUser.isPending}
                    onClick={() => reactivateUser.mutate({ tenantId, id: user.id })}
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

- [ ] **Step 4: Agregar la sección "Usuarios" a la página de la institución**

Reemplazar el contenido completo de `apps/web/src/app/platform/tenants/[id]/page.tsx`:

```tsx
import { EditTenantForm } from '@/features/platform-tenants/components/edit-tenant-form';
import { LogoUploadForm } from '@/features/platform-tenants/components/logo-upload-form';
import { CreatePlatformTenantUserForm } from '@/features/platform-tenant-users/components/create-platform-tenant-user-form';
import { PlatformTenantUsersList } from '@/features/platform-tenant-users/components/platform-tenant-users-list';

export default function EditPlatformTenantPage({ params }: { params: { id: string } }) {
  return (
    <main className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar institución</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nombre, color de marca, dominio y módulos habilitados.
        </p>
      </div>

      <EditTenantForm tenantId={params.id} />

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
        <CreatePlatformTenantUserForm tenantId={params.id} />
        <PlatformTenantUsersList tenantId={params.id} />
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Verificar que el frontend compila**

Run: `cd apps/web && npm run build`
Expected: compila sin errores.

- [ ] **Step 6: Verificar a mano en el navegador**

Con el stack corriendo, loguearse en `/platform/login` como `superadmin@eduapp.test`, entrar a la institución "Santa Teresa" (`/platform/tenants/:id`), y en la sección "Usuarios" nueva:
1. Crear un usuario con rol "Admin institución".
2. Confirmar que aparece en el listado.
3. Editarlo (cambiar el nombre) y confirmar que se actualiza.
4. Resetear su contraseña y confirmar que se muestra la contraseña temporal una sola vez.
5. Desactivarlo (con el diálogo de confirmación) y confirmar que el estado cambia a "Inactivo".
6. Reactivarlo y confirmar que vuelve a "Activo".
7. Loguearse como ese usuario nuevo en el login normal del tenant (`http://localhost:3000/login`, con el subdominio de Santa Teresa) para confirmar que el usuario creado desde plataforma funciona igual que uno creado normalmente.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/platform-tenant-users/components/ \
  apps/web/src/app/platform/tenants/\[id\]/page.tsx
git commit -m "feat(platform): agregar UI de gestión de usuarios por tenant"
```

---

## Verificación final

- [ ] Correr toda la suite de backend una última vez: `cd apps/api && npm test` — debe pasar completo.
- [ ] Correr `cd apps/api && npm run build` y `cd apps/web && npm run build` — ambos deben compilar sin errores.
- [ ] Flujo manual end-to-end: crear un tenant nuevo desde `/platform/tenants/new`, entrar a su pestaña "Usuarios" (vacía), crear el primer admin, y loguearse con ese usuario en el login normal del tenant — confirmando que el bloqueo original (tenant nuevo sin nadie que pueda entrar) queda resuelto de punta a punta.
