# Perfil de Autoservicio de Usuario — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cualquier usuario de un tenant pueda editar sus propios datos básicos (nombre, apellido, fecha de nacimiento, tipo/número de documento, dirección, teléfono) y subir una foto de perfil, desde una página propia accesible desde el header del panel.

**Architecture:** Dos endpoints nuevos de autoservicio (`PATCH /auth/me`, `POST /auth/me/photo`) que reusan el patrón ya existente de `GET /auth/me` — sin CASL, el `userId` viene siempre de `currentUser.sub`, nunca de un parámetro de ruta, así que estructuralmente no puede editar el perfil de otro usuario. La subida de foto reusa `FileStoragePort`/`LocalDiskFileStorage`, el mismo mecanismo que ya usa el logo del tenant.

**Tech Stack:** NestJS (backend), TypeORM (migración de tenant), Next.js App Router + React Query (frontend). Sin librerías nuevas.

**Spec:** `docs/superpowers/specs/2026-09-10-user-self-profile-design.md`

## Global Constraints

- **Email no editable** desde este flujo — excluido explícitamente del DTO y del método de dominio.
- **Roles no editables** desde este flujo — excluido explícitamente del DTO y del método de dominio. Ningún endpoint nuevo de este plan puede aceptar ni tocar `roles`.
- **Sin CASL en los endpoints nuevos** — mismo criterio que `GET /auth/me`/`POST /auth/logout`: el `userId` objetivo viene siempre de `currentUser.sub` (JWT), nunca de `:id` en la URL ni del body.
- **Reusar `FileStoragePort`** para la foto — sin infraestructura de storage nueva. Mismos límites que el logo del tenant: `image/png`, `image/jpeg`, `image/webp` (sin svg — es una foto de persona, no un logo vectorial), máximo 2MB.
- **Sin acceso desde el menú lateral** — solo desde el nombre/avatar del header (`(dashboard)/layout.tsx`).
- **Auditoría normal, sin `@AuditSkip()`** — el interceptor global marca todo `POST`/`PATCH`/`PUT`/`DELETE` sin ese decorador como escritura auditable (`POST /auth/logout` audita hoy por la misma razón; solo `GET /auth/me` no audita, por ser lectura sin `@AuditRead`). No agregar `@AuditSkip()` a los endpoints nuevos — es intencional, no un olvido.

---

### Task 1: Modelo de datos — migración, entidad de dominio, entidad ORM

**Files:**
- Create: `apps/api/src/core/database/migrations/tenant/1700000000065-AddUserPhoneAndPhoto.ts`
- Modify: `apps/api/src/modules/identity/domain/entities/user.entity.ts`
- Modify: `apps/api/src/modules/identity/infrastructure/entities/user.orm-entity.ts`
- Modify: `apps/api/src/modules/identity/infrastructure/repositories/typeorm-user.repository.ts`
- Test: `apps/api/src/modules/identity/domain/entities/user.entity.spec.ts`

**Interfaces:**
- Produces: `User` gana los campos públicos `phone: string | null` y `photoUrl: string | null`, y un método nuevo `editProfile(input)` cuyo parámetro es un tipo inline (no exportado, ver Step 6) con la forma `{ firstName: string; lastName: string; birthDate?: string | null; documentType?: DocumentType | null; documentNumber?: string | null; address?: string | null; phone?: string | null }`. Este método lo consume Task 2 (su propia interfaz `EditMyProfileInput`, definida ahí, es estructuralmente compatible — no hace falta que sea el mismo símbolo importado). La columna ORM `photo_url` (mapeada a `photoUrl`) la consume Task 3 (`UploadMyProfilePhotoUseCase`, que la asigna directamente sin pasar por `editProfile`).

- [ ] **Step 1: Ver la migración de referencia**

Leé `apps/api/src/core/database/migrations/tenant/1700000000048-AddUserPersonalData.ts` — es el mismo patrón exacto que vas a seguir (agregar columnas nullable a `users`, con `up`/`down` simétricos).

- [ ] **Step 2: Crear la migración**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Teléfono de contacto y foto de perfil — ambos opcionales, para el perfil
 * de autoservicio (cualquier usuario puede subir su propia foto y cargar
 * su teléfono, ver EditMyProfileUseCase/UploadMyProfilePhotoUseCase).
 */
export class AddUserPhoneAndPhoto1700000000065 implements MigrationInterface {
  name = 'AddUserPhoneAndPhoto1700000000065';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "phone" varchar,
      ADD COLUMN "photo_url" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "phone",
      DROP COLUMN "photo_url"
    `);
  }
}
```

- [ ] **Step 3: Correr la migración en todos los tenants de dev**

Run: `pnpm --filter @eduapp/api migration:run:tenant:all`
Expected: la salida lista cada schema de tenant (`tenant_colegio_demo`, `tenant_santateresa`, etc.) confirmando que la migración `AddUserPhoneAndPhoto1700000000065` se aplicó.

- [ ] **Step 4: Escribir el test de la entidad de dominio**

`User.editProfile` es lógica de dominio pura — se testea sin mocks, instanciando la clase directamente.

```ts
import { User } from './user.entity';

describe('User.editProfile', () => {
  function buildUser(): User {
    return new User(
      'u-1',
      'juan@test.com',
      'hash',
      'Juan',
      'Pérez',
      ['estudiante'],
      'active',
    );
  }

  it('actualiza nombre, apellido y datos personales', () => {
    const user = buildUser();

    user.editProfile({
      firstName: 'Juana',
      lastName: 'Pérez Gómez',
      birthDate: '2010-05-01',
      documentType: 'TI',
      documentNumber: '1002003000',
      address: 'Calle 10 # 20-30',
      phone: '3001234567',
    });

    expect(user.firstName).toBe('Juana');
    expect(user.lastName).toBe('Pérez Gómez');
    expect(user.birthDate).toBe('2010-05-01');
    expect(user.documentType).toBe('TI');
    expect(user.documentNumber).toBe('1002003000');
    expect(user.address).toBe('Calle 10 # 20-30');
    expect(user.phone).toBe('3001234567');
  });

  it('nunca toca email ni roles, aunque no reciba esos campos', () => {
    const user = buildUser();

    user.editProfile({ firstName: 'Juana', lastName: 'Pérez' });

    expect(user.email).toBe('juan@test.com');
    expect(user.roles).toEqual(['estudiante']);
  });

  it('limpia un campo opcional a null si no viene en el input', () => {
    const user = buildUser();
    user.editProfile({ firstName: 'Juan', lastName: 'Pérez', phone: '3001234567' });

    user.editProfile({ firstName: 'Juan', lastName: 'Pérez' });

    expect(user.phone).toBeNull();
  });
});
```

- [ ] **Step 5: Correr el test para verificar que falla**

Run: `cd apps/api && npx jest user.entity.spec.ts`
Expected: FAIL — `editProfile` no existe todavía, ni los campos `phone`/`photoUrl` en el constructor.

- [ ] **Step 6: Implementar en la entidad de dominio**

En `apps/api/src/modules/identity/domain/entities/user.entity.ts`, agregá `phone` y `photoUrl` al constructor (después de `address`) y el método `editProfile` (después de `edit`):

```ts
  constructor(
    public readonly id: string,
    public email: string,
    private passwordHash: string,
    public firstName: string,
    public lastName: string,
    public roles: UserRole[],
    public status: 'active' | 'invited' | 'suspended',
    private failedLoginAttempts: number = 0,
    private lockedUntil: Date | null = null,
    public birthDate: string | null = null,
    public documentType: DocumentType | null = null,
    public documentNumber: string | null = null,
    public address: string | null = null,
    public phone: string | null = null,
    public photoUrl: string | null = null,
  ) {}
```

```ts
  /**
   * A diferencia de `edit()` (admin editando a otro usuario, con email y
   * roles incluidos), este método solo puede tocar los datos básicos del
   * propio usuario — estructuralmente no puede escalar privilegios ni
   * cambiar el email, aunque el DTO que lo llama tuviera esos campos por
   * error.
   */
  editProfile(input: {
    firstName: string;
    lastName: string;
    birthDate?: string | null;
    documentType?: DocumentType | null;
    documentNumber?: string | null;
    address?: string | null;
    phone?: string | null;
  }): void {
    this.firstName = input.firstName;
    this.lastName = input.lastName;
    this.birthDate = input.birthDate ?? null;
    this.documentType = input.documentType ?? null;
    this.documentNumber = input.documentNumber ?? null;
    this.address = input.address ?? null;
    this.phone = input.phone ?? null;
  }
```

- [ ] **Step 7: Correr el test para verificar que pasa**

Run: `cd apps/api && npx jest user.entity.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 8: Actualizar la entidad ORM**

En `apps/api/src/modules/identity/infrastructure/entities/user.orm-entity.ts`, agregá después de la columna `address`:

```ts
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl: string | null;
```

- [ ] **Step 9: Actualizar el mapeo del repositorio**

En `apps/api/src/modules/identity/infrastructure/repositories/typeorm-user.repository.ts`:

En `toDomain` (agregá los dos campos nuevos al final de la lista de argumentos del `new User(...)`, después de `row.address`):

```ts
  private toDomain(row: UserOrmEntity): User {
    return new User(
      row.id,
      row.email,
      row.passwordHash,
      row.firstName,
      row.lastName,
      row.roles as UserRole[],
      row.status,
      row.failedLoginAttempts,
      row.lockedUntil,
      row.birthDate,
      row.documentType as DocumentType | null,
      row.documentNumber,
      row.address,
      row.phone,
      row.photoUrl,
    );
  }
```

Y en `save` (agregá las dos líneas al objeto que se pasa a `this.repo.save`, después de `address: user.address,`):

```ts
      phone: user.phone,
      photoUrl: user.photoUrl,
```

- [ ] **Step 10: Correr toda la suite del módulo identity para confirmar que nada se rompió**

Run: `cd apps/api && npx jest identity`
Expected: PASS (todos los tests existentes de `identity` siguen pasando, más los 3 nuevos de `user.entity.spec.ts`).

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/core/database/migrations/tenant/1700000000065-AddUserPhoneAndPhoto.ts apps/api/src/modules/identity/domain/entities/user.entity.ts apps/api/src/modules/identity/domain/entities/user.entity.spec.ts apps/api/src/modules/identity/infrastructure/entities/user.orm-entity.ts apps/api/src/modules/identity/infrastructure/repositories/typeorm-user.repository.ts
git commit -m "feat(identity): agregar teléfono y foto de perfil al modelo de usuario"
```

---

### Task 2: `EditMyProfileUseCase` — edición de datos básicos

**Files:**
- Create: `apps/api/src/modules/identity/interface/dtos/edit-my-profile.dto.ts`
- Create: `apps/api/src/modules/identity/application/use-cases/edit-my-profile.use-case.ts`
- Test: `apps/api/src/modules/identity/application/use-cases/edit-my-profile.use-case.spec.ts`

**Interfaces:**
- Consumes: `User.editProfile(input)` de Task 1. `UserRepositoryPort` (`findById`, `findByDocumentNumber`, `save`) — puerto ya existente, sin cambios.
- Produces: `EditMyProfileUseCase.execute(userId: string, input: EditMyProfileDto): Promise<User>`. Este método lo consume Task 3 desde el controller — el `userId` SIEMPRE viene de `currentUser.sub`, nunca de un parámetro de ruta.

- [ ] **Step 1: Crear el DTO**

```ts
import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { DocumentType } from '../../domain/entities/user.entity';

const KNOWN_DOCUMENT_TYPES: DocumentType[] = ['RC', 'TI', 'CC', 'CE', 'PA'];

/**
 * A diferencia de `EditUserDto` (admin editando a otro usuario), este DTO
 * NUNCA incluye `email` ni `roles` — la autoedición no puede tocarlos.
 */
export class EditMyProfileDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsIn(KNOWN_DOCUMENT_TYPES)
  documentType?: DocumentType;

  @IsOptional()
  @IsString()
  @MinLength(3)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
```

Guardalo en `apps/api/src/modules/identity/interface/dtos/edit-my-profile.dto.ts`.

- [ ] **Step 2: Escribir el test del use-case (falla primero)**

```ts
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EditMyProfileUseCase } from './edit-my-profile.use-case';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { User } from '../../domain/entities/user.entity';

describe('EditMyProfileUseCase', () => {
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new EditMyProfileUseCase(users);

  const input = { firstName: 'Juana', lastName: 'Pérez' };

  beforeEach(() => {
    jest.clearAllMocks();
    users.findByDocumentNumber.mockResolvedValue(null);
  });

  it('rechaza si el usuario no existe', async () => {
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute('u-1', input)).rejects.toThrow(NotFoundException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('edita nombre y apellido', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);

    const result = await useCase.execute('u-1', input);

    expect(result.firstName).toBe('Juana');
    expect(users.save).toHaveBeenCalledWith(user);
  });

  it('nunca toca email ni roles, aunque el input los tuviera', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);

    const result = await useCase.execute('u-1', { ...input, email: 'otro@test.com', roles: ['admin_institucion'] } as any);

    expect(result.email).toBe('juan@test.com');
    expect(result.roles).toEqual(['estudiante']);
  });

  it('rechaza si el número de documento ya está en uso por otro usuario', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);
    users.findByDocumentNumber.mockResolvedValue(
      new User('u-2', 'otro@test.com', 'hash', 'Otro', 'Usuario', ['estudiante'], 'active'),
    );

    await expect(useCase.execute('u-1', { ...input, documentNumber: '123' })).rejects.toThrow(ConflictException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('permite guardar el propio número de documento sin cambios', async () => {
    const user = new User(
      'u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active',
      0, null, null, null, '123',
    );
    users.findById.mockResolvedValue(user);
    users.findByDocumentNumber.mockResolvedValue(user);

    const result = await useCase.execute('u-1', { ...input, documentNumber: '123' });

    expect(result.documentNumber).toBe('123');
    expect(users.save).toHaveBeenCalled();
  });

  it('rechaza fecha de nacimiento futura', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);

    await expect(
      useCase.execute('u-1', { ...input, birthDate: '2999-01-01' }),
    ).rejects.toThrow(BadRequestException);
    expect(users.save).not.toHaveBeenCalled();
  });
});
```

Guardalo en `apps/api/src/modules/identity/application/use-cases/edit-my-profile.use-case.spec.ts`.

- [ ] **Step 3: Correr el test para verificar que falla**

Run: `cd apps/api && npx jest edit-my-profile.use-case.spec.ts`
Expected: FAIL — el archivo `edit-my-profile.use-case.ts` no existe todavía.

- [ ] **Step 4: Implementar el use-case**

```ts
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { DocumentType, User } from '../../domain/entities/user.entity';
import { isUniqueViolation } from '../../../../core/database/postgres-error.util';

export interface EditMyProfileInput {
  firstName: string;
  lastName: string;
  birthDate?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  address?: string;
  phone?: string;
}

@Injectable()
export class EditMyProfileUseCase {
  constructor(@Inject(UserRepositoryPort) private readonly users: UserRepositoryPort) {}

  async execute(userId: string, input: EditMyProfileInput): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (input.documentNumber && input.documentNumber !== user.documentNumber) {
      const existing = await this.users.findByDocumentNumber(input.documentNumber);
      if (existing && existing.id !== userId) {
        throw new ConflictException(
          `Ya existe un usuario con número de documento "${input.documentNumber}"`,
        );
      }
    }

    if (input.birthDate && input.birthDate > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('La fecha de nacimiento no puede ser futura');
    }

    user.editProfile(input);

    try {
      await this.users.save(user);
    } catch (err) {
      if (isUniqueViolation(err) && input.documentNumber) {
        throw new ConflictException(
          `Ya existe un usuario con número de documento "${input.documentNumber}"`,
        );
      }
      throw err;
    }
    return user;
  }
}
```

Guardalo en `apps/api/src/modules/identity/application/use-cases/edit-my-profile.use-case.ts`.

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `cd apps/api && npx jest edit-my-profile.use-case.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/identity/interface/dtos/edit-my-profile.dto.ts apps/api/src/modules/identity/application/use-cases/edit-my-profile.use-case.ts apps/api/src/modules/identity/application/use-cases/edit-my-profile.use-case.spec.ts
git commit -m "feat(identity): agregar EditMyProfileUseCase para autoedición de datos básicos"
```

---

### Task 3: `UploadMyProfilePhotoUseCase`, wiring del controlador, y `GET /auth/me` extendido

**Files:**
- Create: `apps/api/src/modules/identity/application/use-cases/upload-my-profile-photo.use-case.ts`
- Test: `apps/api/src/modules/identity/application/use-cases/upload-my-profile-photo.use-case.spec.ts`
- Modify: `apps/api/src/modules/identity/interface/controllers/auth.controller.ts`
- Modify: `apps/api/src/modules/identity/identity.module.ts`
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Consumes: `EditMyProfileUseCase` (Task 2), `FileStoragePort` (`apps/api/src/core/storage/file-storage.port.ts`, ya existente y global — no hace falta agregarlo a `providers` del módulo). `User.photoUrl` (Task 1).
- Produces: `UploadMyProfilePhotoUseCase.execute(userId: string, file: StoredFile): Promise<User>`. Endpoints HTTP `PATCH /auth/me` y `POST /auth/me/photo`, y el `AuthenticatedUser` extendido que consume Task 4 en el frontend:
  ```ts
  export interface AuthenticatedUser {
    id: string;
    email: string;
    fullName: string;
    firstName: string;
    lastName: string;
    roles: string[];
    impersonatedBy: string | null;
    tenantId: string;
    phone: string | null;
    photoUrl: string | null;
    birthDate: string | null;
    documentType: string | null;
    documentNumber: string | null;
    address: string | null;
  }
  ```
  `firstName`/`lastName` se agregan por separado de `fullName` (que sigue siendo el nombre completo concatenado) específicamente para que Task 4 pueda precargar el formulario de edición sin tener que adivinar dónde separar un nombre completo en nombre/apellido — partirlo por espacios rompe con nombres compuestos.

- [ ] **Step 1: Escribir el test del use-case de foto (falla primero)**

```ts
import { NotFoundException } from '@nestjs/common';
import { UploadMyProfilePhotoUseCase } from './upload-my-profile-photo.use-case';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { FileStoragePort } from '../../../../core/storage/file-storage.port';
import { User } from '../../domain/entities/user.entity';

describe('UploadMyProfilePhotoUseCase', () => {
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const storage: jest.Mocked<FileStoragePort> = {
    save: jest.fn(),
    read: jest.fn(),
  };

  const useCase = new UploadMyProfilePhotoUseCase(users, storage);

  const file = { buffer: Buffer.from('fake'), originalname: 'foto.png', mimetype: 'image/png' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rechaza si el usuario no existe', async () => {
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute('u-1', file)).rejects.toThrow(NotFoundException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('guarda el archivo con visibilidad pública en la categoría user-photos y persiste la URL', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);
    storage.save.mockResolvedValue('http://localhost:3001/uploads/user-photos/user-u-1.png');

    const result = await useCase.execute('u-1', file);

    expect(storage.save).toHaveBeenCalledWith('user-photos', 'user-u-1.png', file, 'public');
    expect(result.photoUrl).toBe('http://localhost:3001/uploads/user-photos/user-u-1.png');
    expect(users.save).toHaveBeenCalledWith(user);
  });

  it('resuelve la extensión a partir del mimetype', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);
    storage.save.mockResolvedValue('http://x/foto.jpg');

    await useCase.execute('u-1', { ...file, mimetype: 'image/jpeg', originalname: 'x.jpg' });

    expect(storage.save).toHaveBeenCalledWith('user-photos', 'user-u-1.jpg', expect.anything(), 'public');
  });
});
```

Guardalo en `apps/api/src/modules/identity/application/use-cases/upload-my-profile-photo.use-case.spec.ts`.

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `cd apps/api && npx jest upload-my-profile-photo.use-case.spec.ts`
Expected: FAIL — el archivo no existe todavía.

- [ ] **Step 3: Implementar el use-case**

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { extname } from 'node:path';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { FileStoragePort, StoredFile } from '../../../../core/storage/file-storage.port';
import { User } from '../../domain/entities/user.entity';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

@Injectable()
export class UploadMyProfilePhotoUseCase {
  constructor(
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    @Inject(FileStoragePort) private readonly storage: FileStoragePort,
  ) {}

  async execute(userId: string, file: StoredFile): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const ext = EXTENSION_BY_MIME[file.mimetype] ?? extname(file.originalname).replace('.', '') ?? 'bin';
    user.photoUrl = await this.storage.save('user-photos', `user-${userId}.${ext}`, file, 'public');
    await this.users.save(user);
    return user;
  }
}
```

Guardalo en `apps/api/src/modules/identity/application/use-cases/upload-my-profile-photo.use-case.ts`.

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `cd apps/api && npx jest upload-my-profile-photo.use-case.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Registrar los dos use-cases nuevos en el módulo**

En `apps/api/src/modules/identity/identity.module.ts`, agregá los imports:

```ts
import { EditMyProfileUseCase } from './application/use-cases/edit-my-profile.use-case';
import { UploadMyProfilePhotoUseCase } from './application/use-cases/upload-my-profile-photo.use-case';
```

Y agregalos al array `providers` (después de `EditUserUseCase,`):

```ts
    EditMyProfileUseCase,
    UploadMyProfilePhotoUseCase,
```

`FileStoragePort` NO se agrega a `providers` — es un módulo `@Global()` (`StorageModule`), ya disponible para inyectar en cualquier lado.

- [ ] **Step 6: Extender `AuthenticatedUser` en shared-types**

En `packages/shared-types/src/index.ts`, buscá la interfaz `AuthenticatedUser` y agregale los campos nuevos al final:

```ts
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  roles: string[];
  impersonatedBy: string | null;
  tenantId: string;
  phone: string | null;
  photoUrl: string | null;
  birthDate: string | null;
  documentType: string | null;
  documentNumber: string | null;
  address: string | null;
}
```

- [ ] **Step 7: Extender el controlador**

En `apps/api/src/modules/identity/interface/controllers/auth.controller.ts`, la primera línea hoy es:

```ts
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
```

Reemplazala por (agrega `BadRequestException`, `Patch`, `UploadedFile`, `UseInterceptors`; `Body`/`Controller`/`Get`/`HttpCode`/`Post` ya estaban):

```ts
import { BadRequestException, Body, Controller, Get, HttpCode, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
```

Y agregá, después del resto de imports existentes (antes de `LoginDto`, por ejemplo):

```ts
import { FileInterceptor } from '@nestjs/platform-express';
import { EditMyProfileUseCase } from '../../application/use-cases/edit-my-profile.use-case';
import { UploadMyProfilePhotoUseCase } from '../../application/use-cases/upload-my-profile-photo.use-case';
import { EditMyProfileDto } from '../dtos/edit-my-profile.dto';
```

Agregá al constructor:

```ts
    private readonly editMyProfile: EditMyProfileUseCase,
    private readonly uploadMyProfilePhoto: UploadMyProfilePhotoUseCase,
```

Reemplazá el método `me()` completo por esta versión extendida:

```ts
  // Autogestión: igual criterio que arriba — devuelve solo el usuario del
  // JWT actual (`currentUser.sub`), nunca datos de otro usuario.
  @Get('me')
  async me(@CurrentUser() currentUser: JwtPayload) {
    const user = await this.getCurrentUser.execute(currentUser.sub);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      impersonatedBy: currentUser.impersonatedBy ?? null,
      tenantId: currentUser.tenantId,
      phone: user.phone,
      photoUrl: user.photoUrl,
      birthDate: user.birthDate,
      documentType: user.documentType,
      documentNumber: user.documentNumber,
      address: user.address,
    };
  }

  // Autogestión: el id objetivo es siempre currentUser.sub — igual que
  // arriba, nunca un :id de la URL. Nunca acepta email ni roles (ver
  // EditMyProfileDto).
  @Patch('me')
  async editMe(@Body() dto: EditMyProfileDto, @CurrentUser() currentUser: JwtPayload) {
    const user = await this.editMyProfile.execute(currentUser.sub, dto);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate,
      documentType: user.documentType,
      documentNumber: user.documentNumber,
      address: user.address,
      phone: user.phone,
    };
  }

  // Autogestión, mismo criterio — el archivo se guarda siempre bajo el id
  // del propio caller.
  @Post('me/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Formato de foto no soportado'), ok);
      },
    }),
  )
  async uploadMyPhoto(@UploadedFile() file: Express.Multer.File, @CurrentUser() currentUser: JwtPayload) {
    const user = await this.uploadMyProfilePhoto.execute(currentUser.sub, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
    return { photoUrl: user.photoUrl };
  }
```

- [ ] **Step 8: Correr toda la suite del backend**

Run: `cd apps/api && npm test`
Expected: PASS (todos los tests existentes más los nuevos de este plan).

- [ ] **Step 9: Verificación manual del backend con curl**

Con el servidor de dev corriendo y una cookie de sesión válida de un usuario de tenant (podés extraer el `access_token` desde las devtools del navegador después de loguearte normalmente):

```bash
curl -s http://localhost:3001/auth/me -H "Authorization: Bearer <access_token>" -H "x-tenant-subdomain: colegio-demo" | head -c 500
```

Expected: el JSON incluye ahora `phone`, `photoUrl`, `birthDate`, `documentType`, `documentNumber`, `address` (aunque sean `null`).

```bash
curl -s -X PATCH http://localhost:3001/auth/me -H "Authorization: Bearer <access_token>" -H "x-tenant-subdomain: colegio-demo" -H "content-type: application/json" -d '{"firstName":"Test","lastName":"Editado","phone":"3001112233"}'
```

Expected: `200` con el body reflejando `firstName: "Test"`, `phone: "3001112233"`.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/identity/application/use-cases/upload-my-profile-photo.use-case.ts apps/api/src/modules/identity/application/use-cases/upload-my-profile-photo.use-case.spec.ts apps/api/src/modules/identity/interface/controllers/auth.controller.ts apps/api/src/modules/identity/identity.module.ts packages/shared-types/src/index.ts
git commit -m "feat(identity): agregar endpoints de autoservicio PATCH /auth/me y POST /auth/me/photo"
```

---

### Task 4: Frontend — página de perfil, hook, rutas BFF, y link desde el header

**Files:**
- Create: `apps/web/src/app/api/auth/me/photo/route.ts`
- Modify: `apps/web/src/app/api/auth/me/route.ts`
- Create: `apps/web/src/features/profile/use-profile.ts`
- Create: `apps/web/src/features/profile/components/profile-form.tsx`
- Create: `apps/web/src/app/(dashboard)/profile/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `AuthenticatedUser` extendido (Task 3), `PATCH /auth/me` y `POST /auth/me/photo` (Task 3).
- Produces: `useMyProfile()`, `useEditMyProfile()`, `useUploadMyProfilePhoto()` — hooks nuevos, usados solo dentro de este task.

- [ ] **Step 1: Agregar el handler `PATCH` a la ruta BFF existente**

`apps/web/src/app/api/auth/me/route.ts` ya tiene un `GET`. Agregale, en el mismo archivo, después del `GET`:

```ts
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const user = await serverApiFetch('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (user === null) {
    return NextResponse.json({ message: 'No se pudo actualizar el perfil' }, { status: 400 });
  }
  return NextResponse.json(user);
}
```

Hace falta agregar `NextRequest` al import de `next/server` (hoy solo importa `NextResponse`) y `serverApiFetch` desde `@/lib/server-api` (hoy solo importa `getCurrentUser`).

- [ ] **Step 2: Crear la ruta BFF de subida de foto**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

/**
 * No puede reusar `serverApiFetch` (fuerza `content-type: application/
 * json`). Reenvía el `FormData` entrante tal cual, sin fijar `content-type`
 * — así `fetch` arma el boundary multipart correcto. Mismo criterio que
 * `apps/web/src/app/api/platform/tenants/[id]/logo/route.ts`.
 */
export async function POST(req: NextRequest) {
  const token = cookies().get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const formData = await req.formData();
  const apiRes = await fetch(`${API_URL}/auth/me/photo`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    body: formData,
  });

  if (!apiRes.ok) {
    return NextResponse.json({ message: 'No se pudo subir la foto' }, { status: apiRes.status });
  }
  return NextResponse.json(await apiRes.json());
}
```

Guardalo en `apps/web/src/app/api/auth/me/photo/route.ts`.

- [ ] **Step 3: Crear el hook de perfil**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthenticatedUser } from '@eduapp/shared-types';

async function fetchMyProfile(): Promise<AuthenticatedUser | null> {
  const res = await fetch('/api/auth/me');
  if (!res.ok) return null;
  return res.json();
}

export function useMyProfile() {
  return useQuery({ queryKey: ['my-profile'], queryFn: fetchMyProfile });
}

export interface EditMyProfileInput {
  firstName: string;
  lastName: string;
  birthDate?: string;
  documentType?: string;
  documentNumber?: string;
  address?: string;
  phone?: string;
}

async function editMyProfile(input: EditMyProfileInput): Promise<void> {
  const res = await fetch('/api/auth/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo actualizar el perfil');
  }
}

export function useEditMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editMyProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
  });
}

async function uploadMyProfilePhoto(file: File): Promise<{ photoUrl: string }> {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch('/api/auth/me/photo', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('No se pudo subir la foto');
  return res.json();
}

export function useUploadMyProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadMyProfilePhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
  });
}
```

Guardalo en `apps/web/src/features/profile/use-profile.ts`.

- [ ] **Step 4: Crear el formulario de perfil**

```tsx
'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useMyProfile, useEditMyProfile, useUploadMyProfilePhoto } from '../use-profile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

const DOCUMENT_TYPES = [
  { value: '', label: 'Sin especificar' },
  { value: 'RC', label: 'Registro Civil' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
];

export function ProfileForm() {
  const { data: profile, isLoading } = useMyProfile();
  const editProfile = useEditMyProfile();
  const uploadPhoto = useUploadMyProfilePhoto();
  const [file, setFile] = useState<File | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setBirthDate(profile.birthDate ?? '');
    setDocumentType(profile.documentType ?? '');
    setDocumentNumber(profile.documentNumber ?? '');
    setAddress(profile.address ?? '');
    setPhone(profile.phone ?? '');
  }, [profile]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  function handleUploadPhoto() {
    if (!file) return;
    uploadPhoto.mutate(file, { onSuccess: () => setFile(null) });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    editProfile.mutate({
      firstName,
      lastName,
      birthDate: birthDate || undefined,
      documentType: documentType || undefined,
      documentNumber: documentNumber || undefined,
      address: address || undefined,
      phone: phone || undefined,
    });
  }

  if (isLoading) return <LoadingState />;
  if (!profile) return <p className="text-sm text-destructive">No se pudo cargar tu perfil.</p>;

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-[10px] uppercase tracking-wide text-primary">Foto de perfil</p>
        <div className="mt-2 flex items-center gap-4">
          {profile.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoUrl}
              alt={profile.fullName}
              className="h-16 w-16 rounded-full border border-border object-cover"
            />
          )}
          <div className="space-y-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="text-sm"
            />
            <div>
              <Button type="button" disabled={!file || uploadPhoto.isPending} onClick={handleUploadPhoto}>
                {uploadPhoto.isPending ? 'Subiendo...' : 'Subir foto'}
              </Button>
            </div>
            {uploadPhoto.isError && <p className="text-sm text-destructive">No se pudo subir la foto.</p>}
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-[10px] uppercase tracking-wide text-primary">Datos básicos</p>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Nombre</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Apellido</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Fecha de nacimiento</span>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Teléfono</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Tipo de documento</span>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              >
                {DOCUMENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Número de documento</span>
              <input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="col-span-2 space-y-1 text-sm">
              <span className="text-muted-foreground">Dirección</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
          </div>
          <Button type="submit" disabled={editProfile.isPending}>
            {editProfile.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          {editProfile.isError && (
            <p className="text-sm text-destructive">{(editProfile.error as Error).message}</p>
          )}
          {editProfile.isSuccess && <p className="text-sm text-primary">Perfil actualizado.</p>}
        </form>
      </Card>
    </div>
  );
}
```

Guardalo en `apps/web/src/features/profile/components/profile-form.tsx`.

- [ ] **Step 5: Crear la página**

```tsx
import { ProfileForm } from '@/features/profile/components/profile-form';

export default function ProfilePage() {
  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Actualizá tu foto y tus datos básicos.
        </p>
      </div>
      <div className="max-w-xl">
        <ProfileForm />
      </div>
    </main>
  );
}
```

Guardalo en `apps/web/src/app/(dashboard)/profile/page.tsx`.

- [ ] **Step 6: Enlazar el header al perfil, y mostrar la foto si existe**

En `apps/web/src/app/(dashboard)/layout.tsx`, el bloque actual es:

```tsx
              <div className="text-right">
                <p className="text-sm font-medium leading-tight">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">{formatRoles(user.roles)}</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                {getInitials(user.fullName)}
              </div>
```

Reemplazalo por (agregá `Link` de `next/link` al import si no está ya):

```tsx
              <Link href="/profile" className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium leading-tight">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{formatRoles(user.roles)}</p>
                </div>
                {user.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoUrl}
                    alt={user.fullName}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                    {getInitials(user.fullName)}
                  </div>
                )}
              </Link>
```

- [ ] **Step 7: Type-check**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 8: Verificación manual en navegador**

Con el backend y el frontend de dev corriendo:
1. Entrá con cualquier usuario de tenant (por ejemplo `docente@colegio-demo.test` / `Demo12345!`).
2. Hacé clic en el nombre/avatar del header → debe llevarte a `/profile`.
3. Editá nombre, teléfono, y algún otro campo → "Guardar cambios" → confirmá el mensaje de éxito y que el header (que lee `getCurrentUser()` en el layout, server-side) refleja el nombre nuevo al navegar a otra página.
4. Subí una foto (png/jpeg/webp, menor a 2MB) → confirmá que aparece en el formulario y en el círculo del header.
5. Intentá subir un archivo de otro tipo (ej. un `.pdf`) → confirmá que el navegador ya lo bloquea por el `accept` del input, o si lo fuerzas, que el backend lo rechaza con 400.
6. Repetí el flujo con un usuario de otro rol (ej. `estudianteX@colegio-demo.test` si tiene contraseña conocida, o cualquier otro) para confirmar que el perfil funciona igual sin importar el rol.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/app/api/auth/me/route.ts apps/web/src/app/api/auth/me/photo/route.ts apps/web/src/features/profile/use-profile.ts apps/web/src/features/profile/components/profile-form.tsx "apps/web/src/app/(dashboard)/profile/page.tsx" "apps/web/src/app/(dashboard)/layout.tsx"
git commit -m "feat(profile): agregar página de autoservicio de perfil (foto y datos básicos)"
```
