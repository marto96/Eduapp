# Solicitud de Documentos Self-Service + Notificaciones — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El estudiante/acudiente pide un documento desde su portal; si tiene costo lo paga vía Wompi y el sistema lo genera solo; si es gratis se genera al toque. El único paso manual es que secretaría marque como entregado un documento pedido en físico. Se agrega un sistema de notificaciones genérico (campana + widget) del que esto es el primer emisor.

**Architecture:** Extiende el módulo `documents` existente (hexagonal: domain/application/infrastructure/interface) con dos entidades nuevas (`DocumentTypePrice`, `DocumentRequest`) y reutiliza `IssueDocumentUseCase`/`CreateChargeUseCase` como colaboradores en vez de duplicar su lógica. Agrega un módulo `notifications` nuevo, standalone, sin CASL (acceso self-scoped por `currentUser.sub`, igual que `/auth/me`). `FinanceModule` y `DocumentsModule` quedan mutuamente dependientes (`forwardRef()` en ambos) porque `documents` necesita crear cargos y `finance` necesita avisarle a `documents` cuando uno de esos cargos se paga.

**Tech Stack:** NestJS + TypeORM (backend), Next.js App Router + React Query (frontend), Postgres (una fila por tenant, migraciones en `apps/api/src/core/database/migrations/tenant/`).

**Spec:** `docs/superpowers/specs/2026-09-11-document-requests-design.md`

## Global Constraints

- `concept` en la tabla `charges` es `varchar` sin CHECK constraint — agregar `'documento'` a `ChargeConcept` NO necesita migración, es un cambio puramente de TypeScript.
- Todo repositorio TypeORM inyecta `TENANT_DATA_SOURCE` (no la conexión "platform") — ver `typeorm-issued-document.repository.ts` como referencia exacta.
- `FinanceModule` ↔ `DocumentsModule` es un ciclo de 2 nodos limpio (ninguno comparte hoy un módulo intermedio que importe al otro) — usar `forwardRef()` en ambos `imports`, y verificar con un boot real de Nest (`node dist/main.js` o `npm run dev`), no solo con `npm test` — los tests unitarios instancian use-cases a mano y NO detectan un grafo de módulos roto (ya pasó con la feature de clase virtual del 2026-09-10).
- Ningún endpoint de `notifications` lleva `@CheckPolicies` — el scoping es siempre por `currentUser.sub` en el use-case, igual que `GetCurrentUserUseCase`/`EditMyProfileUseCase`.
- Todas las cadenas de usuario final van en español, mismo tono que el resto de la app (ver mensajes de error existentes en `issue-document.use-case.ts`, `create-charge.use-case.ts`).
- Todo entity nuevo sigue el patrón ya establecido: constructor con validación que lanza `Error` simple (no `HttpException` — eso lo traduce el use-case con `BadRequestException`/`NotFoundException`/etc.).

---

## Task 1: Extender `ChargeConcept` + entidades de dominio `DocumentTypePrice` y `DocumentRequest`

**Files:**
- Modify: `apps/api/src/modules/finance/domain/entities/charge.entity.ts`
- Create: `apps/api/src/modules/documents/domain/entities/document-type-price.entity.ts`
- Create: `apps/api/src/modules/documents/domain/entities/document-type-price.entity.spec.ts`
- Create: `apps/api/src/modules/documents/domain/entities/document-request.entity.ts`
- Create: `apps/api/src/modules/documents/domain/entities/document-request.entity.spec.ts`

**Interfaces:**
- Produces: `ChargeConcept` ahora incluye `'documento'`. `DocumentTypePrice { type, amount }` con `updateAmount(amount)`. `DocumentRequest { id, enrollmentId, type, deliveryMethod, note, requestedBy, requestedAt, status, chargeId, issuedDocumentId, resolvedBy, resolvedAt, rejectionReason }` con métodos `markReady(issuedDocumentId: string): void`, `markDelivered(staffUserId: string): void`, `reject(staffUserId: string, reason: string): void`. Tipos exportados: `DocumentRequestStatus`, `DeliveryMethod`.

- [ ] **Step 1: Agregar `'documento'` a `ChargeConcept`**

En `apps/api/src/modules/finance/domain/entities/charge.entity.ts`, cambiar la primera línea:

```ts
export type ChargeConcept = 'matricula' | 'pension' | 'solicitud_admision' | 'documento' | 'otro';
```

No requiere test nuevo — es un ensanchamiento de unión, los tests existentes de `Charge` siguen pasando tal cual.

- [ ] **Step 2: Escribir el test de `DocumentTypePrice`**

```ts
// apps/api/src/modules/documents/domain/entities/document-type-price.entity.spec.ts
import { DocumentTypePrice } from './document-type-price.entity';

describe('DocumentTypePrice', () => {
  it('se crea con un monto válido', () => {
    const price = new DocumentTypePrice('certificado_notas', 15000);
    expect(price.amount).toBe(15000);
  });

  it('permite monto cero (gratis)', () => {
    const price = new DocumentTypePrice('constancia_matricula', 0);
    expect(price.amount).toBe(0);
  });

  it('rechaza un monto negativo al crear', () => {
    expect(() => new DocumentTypePrice('otro', -100)).toThrow('El precio no puede ser negativo');
  });

  it('updateAmount actualiza el monto', () => {
    const price = new DocumentTypePrice('certificado_notas', 15000);
    price.updateAmount(20000);
    expect(price.amount).toBe(20000);
  });

  it('updateAmount rechaza un monto negativo', () => {
    const price = new DocumentTypePrice('certificado_notas', 15000);
    expect(() => price.updateAmount(-1)).toThrow('El precio no puede ser negativo');
  });
});
```

- [ ] **Step 2b: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest document-type-price.entity.spec.ts`
Expected: FAIL — `Cannot find module './document-type-price.entity'`

- [ ] **Step 3: Implementar `DocumentTypePrice`**

```ts
// apps/api/src/modules/documents/domain/entities/document-type-price.entity.ts
import { DocumentType } from './issued-document.entity';

export class DocumentTypePrice {
  constructor(
    public readonly type: DocumentType,
    public amount: number,
  ) {
    if (amount < 0) {
      throw new Error('El precio no puede ser negativo');
    }
  }

  updateAmount(amount: number): void {
    if (amount < 0) {
      throw new Error('El precio no puede ser negativo');
    }
    this.amount = amount;
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest document-type-price.entity.spec.ts`
Expected: PASS — 5 tests

- [ ] **Step 5: Escribir el test de `DocumentRequest`**

```ts
// apps/api/src/modules/documents/domain/entities/document-request.entity.spec.ts
import { DocumentRequest } from './document-request.entity';

describe('DocumentRequest', () => {
  const build = (overrides: Partial<{ deliveryMethod: 'digital' | 'fisico'; status: DocumentRequest['status'] }> = {}) =>
    new DocumentRequest(
      'req-1',
      'enrollment-1',
      'certificado_notas',
      overrides.deliveryMethod ?? 'digital',
      null,
      'user-1',
      '2026-09-11T10:00:00.000Z',
      overrides.status ?? 'pendiente_pago',
      'charge-1',
    );

  it('markReady deja la solicitud en "lista" si la entrega es digital', () => {
    const req = build({ deliveryMethod: 'digital' });
    req.markReady('doc-1');
    expect(req.status).toBe('lista');
    expect(req.issuedDocumentId).toBe('doc-1');
  });

  it('markReady deja la solicitud en "lista_para_imprimir" si la entrega es física', () => {
    const req = build({ deliveryMethod: 'fisico' });
    req.markReady('doc-1');
    expect(req.status).toBe('lista_para_imprimir');
  });

  it('markDelivered marca entregada una solicitud lista_para_imprimir', () => {
    const req = build({ deliveryMethod: 'fisico', status: 'lista_para_imprimir' });
    req.markDelivered('staff-1');
    expect(req.status).toBe('entregada');
    expect(req.resolvedBy).toBe('staff-1');
    expect(req.resolvedAt).not.toBeNull();
  });

  it('markDelivered lanza error si la solicitud no está lista_para_imprimir', () => {
    const req = build({ deliveryMethod: 'fisico', status: 'pendiente_pago' });
    expect(() => req.markDelivered('staff-1')).toThrow(
      'Solo se puede entregar una solicitud que está lista para imprimir',
    );
  });

  it('reject rechaza una solicitud pendiente_pago', () => {
    const req = build({ status: 'pendiente_pago' });
    req.reject('staff-1', 'Documento ya emitido antes');
    expect(req.status).toBe('rechazada');
    expect(req.rejectionReason).toBe('Documento ya emitido antes');
  });

  it('reject lanza error si la solicitud ya no está pendiente_pago', () => {
    const req = build({ status: 'lista' });
    expect(() => req.reject('staff-1', 'motivo')).toThrow(
      'Solo se puede rechazar una solicitud que todavía no fue pagada',
    );
  });
});
```

- [ ] **Step 6: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest document-request.entity.spec.ts`
Expected: FAIL — `Cannot find module './document-request.entity'`

- [ ] **Step 7: Implementar `DocumentRequest`**

```ts
// apps/api/src/modules/documents/domain/entities/document-request.entity.ts
import { DocumentType } from './issued-document.entity';

export type DocumentRequestStatus =
  | 'pendiente_pago'
  | 'lista_para_imprimir'
  | 'lista'
  | 'entregada'
  | 'rechazada';

export type DeliveryMethod = 'digital' | 'fisico';

export class DocumentRequest {
  constructor(
    public readonly id: string,
    public readonly enrollmentId: string,
    public readonly type: DocumentType,
    public readonly deliveryMethod: DeliveryMethod,
    public readonly note: string | null,
    public readonly requestedBy: string,
    public readonly requestedAt: string,
    public status: DocumentRequestStatus,
    public chargeId: string | null = null,
    public issuedDocumentId: string | null = null,
    public resolvedBy: string | null = null,
    public resolvedAt: string | null = null,
    public rejectionReason: string | null = null,
  ) {}

  markReady(issuedDocumentId: string): void {
    this.issuedDocumentId = issuedDocumentId;
    this.status = this.deliveryMethod === 'digital' ? 'lista' : 'lista_para_imprimir';
  }

  markDelivered(staffUserId: string): void {
    if (this.status !== 'lista_para_imprimir') {
      throw new Error('Solo se puede entregar una solicitud que está lista para imprimir');
    }
    this.status = 'entregada';
    this.resolvedBy = staffUserId;
    this.resolvedAt = new Date().toISOString();
  }

  reject(staffUserId: string, reason: string): void {
    if (this.status !== 'pendiente_pago') {
      throw new Error('Solo se puede rechazar una solicitud que todavía no fue pagada');
    }
    this.status = 'rechazada';
    this.resolvedBy = staffUserId;
    this.resolvedAt = new Date().toISOString();
    this.rejectionReason = reason;
  }
}
```

- [ ] **Step 8: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest document-request.entity.spec.ts`
Expected: PASS — 6 tests

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/finance/domain/entities/charge.entity.ts \
        apps/api/src/modules/documents/domain/entities/document-type-price.entity.ts \
        apps/api/src/modules/documents/domain/entities/document-type-price.entity.spec.ts \
        apps/api/src/modules/documents/domain/entities/document-request.entity.ts \
        apps/api/src/modules/documents/domain/entities/document-request.entity.spec.ts
git commit -m "feat(documents): entidades de dominio para precios y solicitudes de documentos"
```

---

## Task 2: Persistencia — migración, ORM entities y repositorios

**Files:**
- Create: `apps/api/src/core/database/migrations/tenant/1700000000066-CreateDocumentTypePricesAndRequests.ts`
- Create: `apps/api/src/modules/documents/infrastructure/entities/document-type-price.orm-entity.ts`
- Create: `apps/api/src/modules/documents/infrastructure/entities/document-request.orm-entity.ts`
- Create: `apps/api/src/modules/documents/application/ports/document-type-price.repository.port.ts`
- Create: `apps/api/src/modules/documents/application/ports/document-request.repository.port.ts`
- Create: `apps/api/src/modules/documents/infrastructure/repositories/typeorm-document-type-price.repository.ts`
- Create: `apps/api/src/modules/documents/infrastructure/repositories/typeorm-document-request.repository.ts`

**Interfaces:**
- Consumes: `DocumentTypePrice`, `DocumentRequest` de Task 1.
- Produces: `DocumentTypePriceRepositoryPort { findAll(): Promise<DocumentTypePrice[]>, findByType(type): Promise<DocumentTypePrice | null>, save(price): Promise<void> }`. `DocumentRequestRepositoryPort { findAll(filter?): Promise<DocumentRequest[]>, findById(id): Promise<DocumentRequest | null>, findByChargeId(chargeId): Promise<DocumentRequest | null>, save(request): Promise<void> }` con `DocumentRequestFilter { enrollmentIds?: string[]; status?: DocumentRequestStatus }`.

- [ ] **Step 1: Escribir la migración**

```ts
// apps/api/src/core/database/migrations/tenant/1700000000066-CreateDocumentTypePricesAndRequests.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `document_type_prices` no tiene fila para un tipo sin precio configurado
 * todavía — se trata como gratis (amount 0) a nivel de aplicación, ver
 * `ListDocumentTypePricesUseCase`. `document_requests.charge_id` es nullable
 * porque una solicitud gratis nunca crea un cargo.
 */
export class CreateDocumentTypePricesAndRequests1700000000066 implements MigrationInterface {
  name = 'CreateDocumentTypePricesAndRequests1700000000066';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "document_type_prices" (
        "type" varchar PRIMARY KEY,
        "amount" real NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "document_requests" (
        "id" uuid PRIMARY KEY,
        "enrollment_id" uuid NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
        "type" varchar NOT NULL,
        "delivery_method" varchar NOT NULL,
        "note" varchar,
        "requested_by" uuid NOT NULL,
        "requested_at" timestamptz NOT NULL,
        "status" varchar NOT NULL,
        "charge_id" uuid REFERENCES "charges"("id") ON DELETE SET NULL,
        "issued_document_id" uuid REFERENCES "documents"("id") ON DELETE SET NULL,
        "resolved_by" uuid,
        "resolved_at" timestamptz,
        "rejection_reason" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_document_requests_enrollment_id" ON "document_requests" ("enrollment_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_document_requests_status" ON "document_requests" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "document_requests"`);
    await queryRunner.query(`DROP TABLE "document_type_prices"`);
  }
}
```

- [ ] **Step 2: Correr la migración en la base de dev**

Run: `cd apps/api && npm run migration:run:tenant:all`
Expected: la migración `CreateDocumentTypePricesAndRequests1700000000066` aparece aplicada en cada tenant sin error.

- [ ] **Step 3: ORM entities**

```ts
// apps/api/src/modules/documents/infrastructure/entities/document-type-price.orm-entity.ts
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { DocumentType } from '../../domain/entities/issued-document.entity';

@Entity({ name: 'document_type_prices' })
export class DocumentTypePriceOrmEntity {
  @PrimaryColumn()
  type: DocumentType;

  @Column({ type: 'real' })
  amount: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
```

```ts
// apps/api/src/modules/documents/infrastructure/entities/document-request.orm-entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DeliveryMethod, DocumentRequestStatus } from '../../domain/entities/document-request.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';

@Entity({ name: 'document_requests' })
export class DocumentRequestOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'enrollment_id' })
  enrollmentId: string;

  @Column()
  type: DocumentType;

  @Column({ name: 'delivery_method' })
  deliveryMethod: DeliveryMethod;

  @Column({ nullable: true })
  note: string | null;

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt: Date;

  @Column()
  status: DocumentRequestStatus;

  @Column({ name: 'charge_id', nullable: true })
  chargeId: string | null;

  @Column({ name: 'issued_document_id', nullable: true })
  issuedDocumentId: string | null;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
```

- [ ] **Step 4: Ports**

```ts
// apps/api/src/modules/documents/application/ports/document-type-price.repository.port.ts
import { DocumentTypePrice } from '../../domain/entities/document-type-price.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';

export abstract class DocumentTypePriceRepositoryPort {
  abstract findAll(): Promise<DocumentTypePrice[]>;
  abstract findByType(type: DocumentType): Promise<DocumentTypePrice | null>;
  abstract save(price: DocumentTypePrice): Promise<void>;
}
```

```ts
// apps/api/src/modules/documents/application/ports/document-request.repository.port.ts
import { DocumentRequest, DocumentRequestStatus } from '../../domain/entities/document-request.entity';

export interface DocumentRequestFilter {
  enrollmentIds?: string[];
  status?: DocumentRequestStatus;
}

export abstract class DocumentRequestRepositoryPort {
  abstract findAll(filter?: DocumentRequestFilter): Promise<DocumentRequest[]>;
  abstract findById(id: string): Promise<DocumentRequest | null>;
  abstract findByChargeId(chargeId: string): Promise<DocumentRequest | null>;
  abstract save(request: DocumentRequest): Promise<void>;
}
```

- [ ] **Step 5: Repositorios TypeORM**

```ts
// apps/api/src/modules/documents/infrastructure/repositories/typeorm-document-type-price.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DocumentTypePriceRepositoryPort } from '../../application/ports/document-type-price.repository.port';
import { DocumentTypePrice } from '../../domain/entities/document-type-price.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';
import { DocumentTypePriceOrmEntity } from '../entities/document-type-price.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmDocumentTypePriceRepository extends DocumentTypePriceRepositoryPort {
  private readonly repo: Repository<DocumentTypePriceOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(DocumentTypePriceOrmEntity);
  }

  async findAll(): Promise<DocumentTypePrice[]> {
    const rows = await this.repo.find();
    return rows.map((row) => new DocumentTypePrice(row.type, row.amount));
  }

  async findByType(type: DocumentType): Promise<DocumentTypePrice | null> {
    const row = await this.repo.findOne({ where: { type } });
    return row ? new DocumentTypePrice(row.type, row.amount) : null;
  }

  async save(price: DocumentTypePrice): Promise<void> {
    await this.repo.save({ type: price.type, amount: price.amount });
  }
}
```

```ts
// apps/api/src/modules/documents/infrastructure/repositories/typeorm-document-request.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  DocumentRequestFilter,
  DocumentRequestRepositoryPort,
} from '../../application/ports/document-request.repository.port';
import { DocumentRequest } from '../../domain/entities/document-request.entity';
import { DocumentRequestOrmEntity } from '../entities/document-request.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmDocumentRequestRepository extends DocumentRequestRepositoryPort {
  private readonly repo: Repository<DocumentRequestOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(DocumentRequestOrmEntity);
  }

  async findAll(filter?: DocumentRequestFilter): Promise<DocumentRequest[]> {
    const query = this.repo.createQueryBuilder('r').orderBy('r.requested_at', 'DESC');
    if (filter?.enrollmentIds) {
      query.andWhere('r.enrollment_id = ANY(:enrollmentIds)', { enrollmentIds: filter.enrollmentIds });
    }
    if (filter?.status) {
      query.andWhere('r.status = :status', { status: filter.status });
    }
    const rows = await query.getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<DocumentRequest | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByChargeId(chargeId: string): Promise<DocumentRequest | null> {
    const row = await this.repo.findOne({ where: { chargeId } });
    return row ? this.toDomain(row) : null;
  }

  async save(request: DocumentRequest): Promise<void> {
    await this.repo.save({
      id: request.id,
      enrollmentId: request.enrollmentId,
      type: request.type,
      deliveryMethod: request.deliveryMethod,
      note: request.note,
      requestedBy: request.requestedBy,
      requestedAt: new Date(request.requestedAt),
      status: request.status,
      chargeId: request.chargeId,
      issuedDocumentId: request.issuedDocumentId,
      resolvedBy: request.resolvedBy,
      resolvedAt: request.resolvedAt ? new Date(request.resolvedAt) : null,
      rejectionReason: request.rejectionReason,
    });
  }

  private toDomain(row: DocumentRequestOrmEntity): DocumentRequest {
    return new DocumentRequest(
      row.id,
      row.enrollmentId,
      row.type,
      row.deliveryMethod,
      row.note,
      row.requestedBy,
      row.requestedAt.toISOString(),
      row.status,
      row.chargeId,
      row.issuedDocumentId,
      row.resolvedBy,
      row.resolvedAt ? row.resolvedAt.toISOString() : null,
      row.rejectionReason,
    );
  }
}
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/api && npx tsc --noEmit`
Expected: sin errores (los repositorios todavía no están registrados en ningún módulo, pero deben compilar solos).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/core/database/migrations/tenant/1700000000066-CreateDocumentTypePricesAndRequests.ts \
        apps/api/src/modules/documents/infrastructure/entities/document-type-price.orm-entity.ts \
        apps/api/src/modules/documents/infrastructure/entities/document-request.orm-entity.ts \
        apps/api/src/modules/documents/application/ports/document-type-price.repository.port.ts \
        apps/api/src/modules/documents/application/ports/document-request.repository.port.ts \
        apps/api/src/modules/documents/infrastructure/repositories/typeorm-document-type-price.repository.ts \
        apps/api/src/modules/documents/infrastructure/repositories/typeorm-document-request.repository.ts
git commit -m "feat(documents): migración y repositorios TypeORM para precios y solicitudes"
```

---

## Task 3: Módulo `notifications` completo (standalone)

**Files:**
- Create: `apps/api/src/modules/notifications/domain/entities/notification.entity.ts`
- Create: `apps/api/src/modules/notifications/domain/entities/notification.entity.spec.ts`
- Create: `apps/api/src/core/database/migrations/tenant/1700000000067-CreateNotifications.ts`
- Create: `apps/api/src/modules/notifications/infrastructure/entities/notification.orm-entity.ts`
- Create: `apps/api/src/modules/notifications/application/ports/notification.repository.port.ts`
- Create: `apps/api/src/modules/notifications/infrastructure/repositories/typeorm-notification.repository.ts`
- Create: `apps/api/src/modules/notifications/application/use-cases/create-notification.use-case.ts`
- Create: `apps/api/src/modules/notifications/application/use-cases/list-my-notifications.use-case.ts`
- Create: `apps/api/src/modules/notifications/application/use-cases/count-unread-notifications.use-case.ts`
- Create: `apps/api/src/modules/notifications/application/use-cases/mark-notification-read.use-case.ts`
- Create: `apps/api/src/modules/notifications/application/use-cases/mark-notification-read.use-case.spec.ts`
- Create: `apps/api/src/modules/notifications/application/use-cases/mark-all-notifications-read.use-case.ts`
- Create: `apps/api/src/modules/notifications/interface/controllers/notifications.controller.ts`
- Create: `apps/api/src/modules/notifications/notifications.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `CreateNotificationUseCase.execute({recipientUserId, type, title, body, link}): Promise<Notification>` — este es el método que `documents` va a inyectar y llamar en Task 6. `NotificationsModule` exporta `CreateNotificationUseCase`.

- [ ] **Step 1: Entidad de dominio**

```ts
// apps/api/src/modules/notifications/domain/entities/notification.entity.ts
export class Notification {
  constructor(
    public readonly id: string,
    public readonly recipientUserId: string,
    public readonly type: string,
    public readonly title: string,
    public readonly body: string,
    public readonly link: string,
    public readonly createdAt: string,
    public readAt: string | null = null,
  ) {}

  markRead(): void {
    if (!this.readAt) {
      this.readAt = new Date().toISOString();
    }
  }
}
```

```ts
// apps/api/src/modules/notifications/domain/entities/notification.entity.spec.ts
import { Notification } from './notification.entity';

describe('Notification', () => {
  it('markRead setea readAt', () => {
    const n = new Notification('n1', 'user-1', 'x', 'Título', 'Cuerpo', '/x', '2026-09-11T00:00:00.000Z');
    expect(n.readAt).toBeNull();
    n.markRead();
    expect(n.readAt).not.toBeNull();
  });

  it('markRead es idempotente — no pisa un readAt ya seteado', () => {
    const n = new Notification('n1', 'user-1', 'x', 'Título', 'Cuerpo', '/x', '2026-09-11T00:00:00.000Z');
    n.markRead();
    const firstReadAt = n.readAt;
    n.markRead();
    expect(n.readAt).toBe(firstReadAt);
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar) e implementar (ya escrito arriba), luego correr de nuevo**

Run: `cd apps/api && npx jest notification.entity.spec.ts`
Expected primero: FAIL (`Cannot find module`). Después de guardar el archivo de arriba: PASS — 2 tests.

- [ ] **Step 3: Migración**

```ts
// apps/api/src/core/database/migrations/tenant/1700000000067-CreateNotifications.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1700000000067 implements MigrationInterface {
  name = 'CreateNotifications1700000000067';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY,
        "recipient_user_id" uuid NOT NULL,
        "type" varchar NOT NULL,
        "title" varchar NOT NULL,
        "body" varchar NOT NULL,
        "link" varchar NOT NULL,
        "created_at" timestamptz NOT NULL,
        "read_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_recipient" ON "notifications" ("recipient_user_id", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
```

Run: `cd apps/api && npm run migration:run:tenant:all`
Expected: migración aplicada sin error.

- [ ] **Step 4: ORM entity + port + repositorio**

```ts
// apps/api/src/modules/notifications/infrastructure/entities/notification.orm-entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'notifications' })
export class NotificationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipient_user_id' })
  recipientUserId: string;

  @Column()
  type: string;

  @Column()
  title: string;

  @Column()
  body: string;

  @Column()
  link: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;
}
```

```ts
// apps/api/src/modules/notifications/application/ports/notification.repository.port.ts
import { Notification } from '../../domain/entities/notification.entity';

export abstract class NotificationRepositoryPort {
  /** Las más recientes primero, como máximo `limit`. */
  abstract findRecentByRecipient(recipientUserId: string, limit: number): Promise<Notification[]>;
  abstract countUnreadByRecipient(recipientUserId: string): Promise<number>;
  abstract findById(id: string): Promise<Notification | null>;
  abstract findAllUnreadByRecipient(recipientUserId: string): Promise<Notification[]>;
  abstract save(notification: Notification): Promise<void>;
  abstract saveMany(notifications: Notification[]): Promise<void>;
}
```

```ts
// apps/api/src/modules/notifications/infrastructure/repositories/typeorm-notification.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { NotificationRepositoryPort } from '../../application/ports/notification.repository.port';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationOrmEntity } from '../entities/notification.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmNotificationRepository extends NotificationRepositoryPort {
  private readonly repo: Repository<NotificationOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(NotificationOrmEntity);
  }

  async findRecentByRecipient(recipientUserId: string, limit: number): Promise<Notification[]> {
    const rows = await this.repo.find({
      where: { recipientUserId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async countUnreadByRecipient(recipientUserId: string): Promise<number> {
    return this.repo.count({ where: { recipientUserId, readAt: IsNull() } });
  }

  async findById(id: string): Promise<Notification | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findAllUnreadByRecipient(recipientUserId: string): Promise<Notification[]> {
    const rows = await this.repo.find({ where: { recipientUserId, readAt: IsNull() } });
    return rows.map((row) => this.toDomain(row));
  }

  async save(notification: Notification): Promise<void> {
    await this.repo.save({
      id: notification.id,
      recipientUserId: notification.recipientUserId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      createdAt: new Date(notification.createdAt),
      readAt: notification.readAt ? new Date(notification.readAt) : null,
    });
  }

  async saveMany(notifications: Notification[]): Promise<void> {
    await this.repo.save(
      notifications.map((n) => ({
        id: n.id,
        recipientUserId: n.recipientUserId,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        createdAt: new Date(n.createdAt),
        readAt: n.readAt ? new Date(n.readAt) : null,
      })),
    );
  }

  private toDomain(row: NotificationOrmEntity): Notification {
    return new Notification(
      row.id,
      row.recipientUserId,
      row.type,
      row.title,
      row.body,
      row.link,
      row.createdAt.toISOString(),
      row.readAt ? row.readAt.toISOString() : null,
    );
  }
}
```

- [ ] **Step 5: Casos de uso**

```ts
// apps/api/src/modules/notifications/application/use-cases/create-notification.use-case.ts
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { NotificationRepositoryPort } from '../ports/notification.repository.port';
import { Notification } from '../../domain/entities/notification.entity';

export interface CreateNotificationInput {
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  link: string;
}

@Injectable()
export class CreateNotificationUseCase {
  constructor(@Inject(NotificationRepositoryPort) private readonly notifications: NotificationRepositoryPort) {}

  async execute(input: CreateNotificationInput): Promise<Notification> {
    const notification = new Notification(
      randomUUID(),
      input.recipientUserId,
      input.type,
      input.title,
      input.body,
      input.link,
      new Date().toISOString(),
    );
    await this.notifications.save(notification);
    return notification;
  }
}
```

```ts
// apps/api/src/modules/notifications/application/use-cases/list-my-notifications.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { NotificationRepositoryPort } from '../ports/notification.repository.port';
import { Notification } from '../../domain/entities/notification.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

const RECENT_LIMIT = 20;

@Injectable()
export class ListMyNotificationsUseCase {
  constructor(@Inject(NotificationRepositoryPort) private readonly notifications: NotificationRepositoryPort) {}

  async execute(currentUser: JwtPayload): Promise<Notification[]> {
    return this.notifications.findRecentByRecipient(currentUser.sub, RECENT_LIMIT);
  }
}
```

```ts
// apps/api/src/modules/notifications/application/use-cases/count-unread-notifications.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { NotificationRepositoryPort } from '../ports/notification.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class CountUnreadNotificationsUseCase {
  constructor(@Inject(NotificationRepositoryPort) private readonly notifications: NotificationRepositoryPort) {}

  async execute(currentUser: JwtPayload): Promise<number> {
    return this.notifications.countUnreadByRecipient(currentUser.sub);
  }
}
```

```ts
// apps/api/src/modules/notifications/application/use-cases/mark-notification-read.use-case.ts
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationRepositoryPort } from '../ports/notification.repository.port';
import { Notification } from '../../domain/entities/notification.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(@Inject(NotificationRepositoryPort) private readonly notifications: NotificationRepositoryPort) {}

  async execute(id: string, currentUser: JwtPayload): Promise<Notification> {
    const notification = await this.notifications.findById(id);
    if (!notification) {
      throw new NotFoundException(`No existe la notificación "${id}"`);
    }
    if (notification.recipientUserId !== currentUser.sub) {
      throw new ForbiddenException('Esta notificación no te pertenece');
    }
    notification.markRead();
    await this.notifications.save(notification);
    return notification;
  }
}
```

```ts
// apps/api/src/modules/notifications/application/use-cases/mark-notification-read.use-case.spec.ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MarkNotificationReadUseCase } from './mark-notification-read.use-case';
import { NotificationRepositoryPort } from '../ports/notification.repository.port';
import { Notification } from '../../domain/entities/notification.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('MarkNotificationReadUseCase', () => {
  const notifications: jest.Mocked<NotificationRepositoryPort> = {
    findRecentByRecipient: jest.fn(),
    countUnreadByRecipient: jest.fn(),
    findById: jest.fn(),
    findAllUnreadByRecipient: jest.fn(),
    save: jest.fn(),
    saveMany: jest.fn(),
  };

  const useCase = new MarkNotificationReadUseCase(notifications);

  function user(sub: string): JwtPayload {
    return { sub, email: 'u@x.com', roles: ['secretaria'], tenantId: 't1' };
  }

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si la notificación no existe', async () => {
    notifications.findById.mockResolvedValue(null);
    await expect(useCase.execute('n1', user('user-1'))).rejects.toThrow(NotFoundException);
  });

  it('lanza ForbiddenException si la notificación es de otro usuario', async () => {
    notifications.findById.mockResolvedValue(
      new Notification('n1', 'otro-user', 'x', 'T', 'B', '/x', '2026-09-11T00:00:00.000Z'),
    );
    await expect(useCase.execute('n1', user('user-1'))).rejects.toThrow(ForbiddenException);
  });

  it('marca como leída la notificación propia', async () => {
    const notification = new Notification('n1', 'user-1', 'x', 'T', 'B', '/x', '2026-09-11T00:00:00.000Z');
    notifications.findById.mockResolvedValue(notification);
    const result = await useCase.execute('n1', user('user-1'));
    expect(result.readAt).not.toBeNull();
    expect(notifications.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }));
  });
});
```

```ts
// apps/api/src/modules/notifications/application/use-cases/mark-all-notifications-read.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { NotificationRepositoryPort } from '../ports/notification.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(@Inject(NotificationRepositoryPort) private readonly notifications: NotificationRepositoryPort) {}

  async execute(currentUser: JwtPayload): Promise<void> {
    const unread = await this.notifications.findAllUnreadByRecipient(currentUser.sub);
    unread.forEach((n) => n.markRead());
    if (unread.length > 0) {
      await this.notifications.saveMany(unread);
    }
  }
}
```

- [ ] **Step 6: Correr el test unitario nuevo**

Run: `cd apps/api && npx jest mark-notification-read.use-case.spec.ts`
Expected: PASS — 3 tests.

- [ ] **Step 7: Controller**

```ts
// apps/api/src/modules/notifications/interface/controllers/notifications.controller.ts
import { Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { ListMyNotificationsUseCase } from '../../application/use-cases/list-my-notifications.use-case';
import { CountUnreadNotificationsUseCase } from '../../application/use-cases/count-unread-notifications.use-case';
import { MarkNotificationReadUseCase } from '../../application/use-cases/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from '../../application/use-cases/mark-all-notifications-read.use-case';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly listMyNotifications: ListMyNotificationsUseCase,
    private readonly countUnread: CountUnreadNotificationsUseCase,
    private readonly markRead: MarkNotificationReadUseCase,
    private readonly markAllRead: MarkAllNotificationsReadUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.listMyNotifications.execute(user);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.countUnread.execute(user);
    return { count };
  }

  @Patch(':id/read')
  async read(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.markRead.execute(id, user);
  }

  @Patch('read-all')
  async readAll(@CurrentUser() user: JwtPayload) {
    await this.markAllRead.execute(user);
    return { ok: true };
  }
}
```

- [ ] **Step 8: Módulo**

```ts
// apps/api/src/modules/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsController } from './interface/controllers/notifications.controller';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.use-case';
import { ListMyNotificationsUseCase } from './application/use-cases/list-my-notifications.use-case';
import { CountUnreadNotificationsUseCase } from './application/use-cases/count-unread-notifications.use-case';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read.use-case';
import { NotificationRepositoryPort } from './application/ports/notification.repository.port';
import { TypeOrmNotificationRepository } from './infrastructure/repositories/typeorm-notification.repository';

@Module({
  controllers: [NotificationsController],
  providers: [
    CreateNotificationUseCase,
    ListMyNotificationsUseCase,
    CountUnreadNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
    { provide: NotificationRepositoryPort, useClass: TypeOrmNotificationRepository },
  ],
  exports: [CreateNotificationUseCase],
})
export class NotificationsModule {}
```

- [ ] **Step 9: Registrar en `app.module.ts`**

Agregar el import junto a los demás módulos de `modules/` (después de `AuditModule`):

```ts
import { NotificationsModule } from './modules/notifications/notifications.module';
```

Y agregar `NotificationsModule` al array `imports` del `@Module`, después de `AuditModule`.

- [ ] **Step 10: Typecheck + test suite completo**

Run: `cd apps/api && npx tsc --noEmit && npx jest`
Expected: sin errores de tipos; todos los tests pasan (los nuevos + los existentes sin romper nada).

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/modules/notifications apps/api/src/core/database/migrations/tenant/1700000000067-CreateNotifications.ts apps/api/src/app.module.ts
git commit -m "feat(notifications): módulo genérico de notificaciones (campana + widget)"
```

---

## Task 4: Precio por tipo de documento — casos de uso + endpoints

**Files:**
- Create: `apps/api/src/modules/documents/application/use-cases/list-document-type-prices.use-case.ts`
- Create: `apps/api/src/modules/documents/application/use-cases/set-document-type-price.use-case.ts`
- Create: `apps/api/src/modules/documents/application/use-cases/set-document-type-price.use-case.spec.ts`
- Create: `apps/api/src/modules/documents/interface/dtos/set-document-type-price.dto.ts`
- Modify: `apps/api/src/modules/documents/interface/controllers/documents.controller.ts`
- Modify: `apps/api/src/modules/documents/documents.module.ts`

**Interfaces:**
- Consumes: `DocumentTypePriceRepositoryPort` de Task 2.
- Produces: `GET /documents/types/prices` → `DocumentTypePrice[]` (los 4 tipos, con `amount: 0` para los que no tienen fila). `PUT /documents/types/prices/:type` `{amount}` → `DocumentTypePrice`.

- [ ] **Step 1: `ListDocumentTypePricesUseCase`**

```ts
// apps/api/src/modules/documents/application/use-cases/list-document-type-prices.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { DocumentTypePriceRepositoryPort } from '../ports/document-type-price.repository.port';
import { DocumentTypePrice } from '../../domain/entities/document-type-price.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';

const ALL_TYPES: DocumentType[] = [
  'constancia_matricula',
  'certificado_notas',
  'constancia_buena_conducta',
  'otro',
];

@Injectable()
export class ListDocumentTypePricesUseCase {
  constructor(
    @Inject(DocumentTypePriceRepositoryPort) private readonly prices: DocumentTypePriceRepositoryPort,
  ) {}

  async execute(): Promise<DocumentTypePrice[]> {
    const existing = await this.prices.findAll();
    const byType = new Map(existing.map((p) => [p.type, p]));
    return ALL_TYPES.map((type) => byType.get(type) ?? new DocumentTypePrice(type, 0));
  }
}
```

- [ ] **Step 2: Escribir el test de `SetDocumentTypePriceUseCase`**

```ts
// apps/api/src/modules/documents/application/use-cases/set-document-type-price.use-case.spec.ts
import { BadRequestException } from '@nestjs/common';
import { SetDocumentTypePriceUseCase } from './set-document-type-price.use-case';
import { DocumentTypePriceRepositoryPort } from '../ports/document-type-price.repository.port';
import { DocumentTypePrice } from '../../domain/entities/document-type-price.entity';

describe('SetDocumentTypePriceUseCase', () => {
  const prices: jest.Mocked<DocumentTypePriceRepositoryPort> = {
    findAll: jest.fn(),
    findByType: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new SetDocumentTypePriceUseCase(prices);

  beforeEach(() => jest.clearAllMocks());

  it('crea el precio si el tipo no tenía uno todavía', async () => {
    prices.findByType.mockResolvedValue(null);
    const result = await useCase.execute('certificado_notas', 15000);
    expect(result.amount).toBe(15000);
    expect(prices.save).toHaveBeenCalledWith(expect.objectContaining({ type: 'certificado_notas', amount: 15000 }));
  });

  it('actualiza el precio si el tipo ya tenía uno', async () => {
    prices.findByType.mockResolvedValue(new DocumentTypePrice('certificado_notas', 10000));
    const result = await useCase.execute('certificado_notas', 20000);
    expect(result.amount).toBe(20000);
  });

  it('rechaza un monto negativo', async () => {
    prices.findByType.mockResolvedValue(null);
    await expect(useCase.execute('certificado_notas', -1)).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest set-document-type-price.use-case.spec.ts`
Expected: FAIL — `Cannot find module './set-document-type-price.use-case'`

- [ ] **Step 4: Implementar `SetDocumentTypePriceUseCase`**

```ts
// apps/api/src/modules/documents/application/use-cases/set-document-type-price.use-case.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DocumentTypePriceRepositoryPort } from '../ports/document-type-price.repository.port';
import { DocumentTypePrice } from '../../domain/entities/document-type-price.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';

@Injectable()
export class SetDocumentTypePriceUseCase {
  constructor(
    @Inject(DocumentTypePriceRepositoryPort) private readonly prices: DocumentTypePriceRepositoryPort,
  ) {}

  async execute(type: DocumentType, amount: number): Promise<DocumentTypePrice> {
    const existing = await this.prices.findByType(type);
    let price: DocumentTypePrice;
    try {
      if (existing) {
        existing.updateAmount(amount);
        price = existing;
      } else {
        price = new DocumentTypePrice(type, amount);
      }
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    await this.prices.save(price);
    return price;
  }
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest set-document-type-price.use-case.spec.ts`
Expected: PASS — 3 tests.

- [ ] **Step 6: DTO**

```ts
// apps/api/src/modules/documents/interface/dtos/set-document-type-price.dto.ts
import { IsNumber, Min } from 'class-validator';

export class SetDocumentTypePriceDto {
  @IsNumber()
  @Min(0)
  amount: number;
}
```

- [ ] **Step 7: Endpoints en el controller existente**

En `apps/api/src/modules/documents/interface/controllers/documents.controller.ts`, agregar los imports:

```ts
import { ListDocumentTypePricesUseCase } from '../../application/use-cases/list-document-type-prices.use-case';
import { SetDocumentTypePriceUseCase } from '../../application/use-cases/set-document-type-price.use-case';
import { SetDocumentTypePriceDto } from '../dtos/set-document-type-price.dto';
import type { DocumentType } from '../../domain/entities/issued-document.entity';
```

Agregar los dos use-cases al constructor (junto a los 4 existentes):

```ts
    private readonly listDocumentTypePrices: ListDocumentTypePricesUseCase,
    private readonly setDocumentTypePrice: SetDocumentTypePriceUseCase,
```

Y agregar los dos endpoints nuevos al final de la clase, antes del cierre:

```ts
  @Get('types/prices')
  async listTypePrices() {
    return this.listDocumentTypePrices.execute();
  }

  @Put('types/prices/:type')
  @CheckPolicies((ability) => ability.can('manage', 'Document'))
  async setTypePrice(@Param('type') type: DocumentType, @Body() dto: SetDocumentTypePriceDto) {
    return this.setDocumentTypePrice.execute(type, dto.amount);
  }
```

Agregar `Put` al import de `@nestjs/common` en la primera línea del archivo (ya importa `Body, Controller, Get, Param, Patch, Post, Query, Res` — sumar `Put`).

- [ ] **Step 8: Registrar en `documents.module.ts`**

Agregar a los imports:

```ts
import { ListDocumentTypePricesUseCase } from './application/use-cases/list-document-type-prices.use-case';
import { SetDocumentTypePriceUseCase } from './application/use-cases/set-document-type-price.use-case';
import { DocumentTypePriceRepositoryPort } from './application/ports/document-type-price.repository.port';
import { TypeOrmDocumentTypePriceRepository } from './infrastructure/repositories/typeorm-document-type-price.repository';
```

Y al array `providers`:

```ts
    ListDocumentTypePricesUseCase,
    SetDocumentTypePriceUseCase,
    { provide: DocumentTypePriceRepositoryPort, useClass: TypeOrmDocumentTypePriceRepository },
```

- [ ] **Step 9: Typecheck**

Run: `cd apps/api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/documents
git commit -m "feat(documents): precio configurable por tipo de documento"
```

---

## Task 5: `RequestDocumentUseCase` + wiring circular `documents` ↔ `finance`

**Files:**
- Create: `apps/api/src/modules/documents/application/use-cases/request-document.use-case.ts`
- Create: `apps/api/src/modules/documents/application/use-cases/request-document.use-case.spec.ts`
- Create: `apps/api/src/modules/documents/interface/dtos/request-document.dto.ts`
- Modify: `apps/api/src/modules/documents/interface/controllers/documents.controller.ts`
- Modify: `apps/api/src/modules/documents/documents.module.ts`
- Modify: `apps/api/src/modules/finance/finance.module.ts`

**Interfaces:**
- Consumes: `IssueDocumentUseCase` (ya existe), `CreateChargeUseCase` (de `finance`, ya existe), `EnrollmentAccessService` (ya existe), `DocumentRequestRepositoryPort` y `DocumentTypePriceRepositoryPort` (Task 2/4).
- Produces: `POST /documents/requests` `{enrollmentId, type, deliveryMethod, note?}` → `DocumentRequest`.

- [ ] **Step 1: Escribir el test de `RequestDocumentUseCase`**

```ts
// apps/api/src/modules/documents/application/use-cases/request-document.use-case.spec.ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RequestDocumentUseCase } from './request-document.use-case';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { DocumentTypePriceRepositoryPort } from '../ports/document-type-price.repository.port';
import { DocumentTypePrice } from '../../domain/entities/document-type-price.entity';
import { IssueDocumentUseCase } from './issue-document.use-case';
import { CreateChargeUseCase } from '../../../finance/application/use-cases/create-charge.use-case';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { IssuedDocument } from '../../domain/entities/issued-document.entity';
import { Charge } from '../../../finance/domain/entities/charge.entity';

describe('RequestDocumentUseCase', () => {
  const documentRequests: jest.Mocked<DocumentRequestRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByChargeId: jest.fn(),
    save: jest.fn(),
  };
  const prices: jest.Mocked<DocumentTypePriceRepositoryPort> = {
    findAll: jest.fn(),
    findByType: jest.fn(),
    save: jest.fn(),
  };
  const issueDocument = { execute: jest.fn() } as unknown as jest.Mocked<IssueDocumentUseCase>;
  const createCharge = { execute: jest.fn() } as unknown as jest.Mocked<CreateChargeUseCase>;
  const enrollmentAccess = {
    resolveAccessibleEnrollmentIds: jest.fn(),
  } as unknown as jest.Mocked<EnrollmentAccessService>;

  const useCase = new RequestDocumentUseCase(
    documentRequests,
    prices,
    issueDocument,
    createCharge,
    enrollmentAccess,
  );

  function user(sub: string): JwtPayload {
    return { sub, email: 'u@x.com', roles: ['padre_tutor'], tenantId: 't1' };
  }

  beforeEach(() => jest.clearAllMocks());

  it('lanza ForbiddenException si el enrollment no es accesible para el usuario', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(new Set(['otro-enrollment']));
    await expect(
      useCase.execute({ enrollmentId: 'enrollment-1', type: 'certificado_notas', deliveryMethod: 'digital' }, user('padre-1')),
    ).rejects.toThrow(ForbiddenException);
  });

  it('si el tipo es gratis, genera el documento en el momento y queda "lista" (digital)', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(new Set(['enrollment-1']));
    prices.findByType.mockResolvedValue(null); // sin fila = gratis
    issueDocument.execute.mockResolvedValue(
      new IssuedDocument('doc-1', 'enrollment-1', 'certificado_notas', 'Certificado de notas', '2026-09-11', 'padre-1'),
    );

    const result = await useCase.execute(
      { enrollmentId: 'enrollment-1', type: 'certificado_notas', deliveryMethod: 'digital' },
      user('padre-1'),
    );

    expect(result.status).toBe('lista');
    expect(result.issuedDocumentId).toBe('doc-1');
    expect(createCharge.execute).not.toHaveBeenCalled();
  });

  it('si el tipo es gratis y la entrega es física, queda "lista_para_imprimir"', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(new Set(['enrollment-1']));
    prices.findByType.mockResolvedValue(new DocumentTypePrice('certificado_notas', 0));
    issueDocument.execute.mockResolvedValue(
      new IssuedDocument('doc-1', 'enrollment-1', 'certificado_notas', 'Certificado de notas', '2026-09-11', 'padre-1'),
    );

    const result = await useCase.execute(
      { enrollmentId: 'enrollment-1', type: 'certificado_notas', deliveryMethod: 'fisico' },
      user('padre-1'),
    );

    expect(result.status).toBe('lista_para_imprimir');
  });

  it('si el tipo tiene costo, crea el cargo y la solicitud queda "pendiente_pago" sin generar el PDF', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(new Set(['enrollment-1']));
    prices.findByType.mockResolvedValue(new DocumentTypePrice('certificado_notas', 15000));
    createCharge.execute.mockResolvedValue(
      new Charge('charge-1', 'enrollment-1', 'documento', 'Certificado de notas', 15000, '2026-09-11'),
    );

    const result = await useCase.execute(
      { enrollmentId: 'enrollment-1', type: 'certificado_notas', deliveryMethod: 'digital' },
      user('padre-1'),
    );

    expect(result.status).toBe('pendiente_pago');
    expect(result.chargeId).toBe('charge-1');
    expect(issueDocument.execute).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest request-document.use-case.spec.ts`
Expected: FAIL — `Cannot find module './request-document.use-case'`

- [ ] **Step 3: DTO**

```ts
// apps/api/src/modules/documents/interface/dtos/request-document.dto.ts
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { DocumentType } from '../../domain/entities/issued-document.entity';
import { DeliveryMethod } from '../../domain/entities/document-request.entity';

const KNOWN_TYPES: DocumentType[] = [
  'constancia_matricula',
  'certificado_notas',
  'constancia_buena_conducta',
  'otro',
];
const KNOWN_DELIVERY_METHODS: DeliveryMethod[] = ['digital', 'fisico'];

export class RequestDocumentDto {
  @IsUUID()
  enrollmentId: string;

  @IsIn(KNOWN_TYPES)
  type: DocumentType;

  @IsIn(KNOWN_DELIVERY_METHODS)
  deliveryMethod: DeliveryMethod;

  @IsOptional()
  @IsString()
  note?: string;
}
```

- [ ] **Step 4: Implementar `RequestDocumentUseCase`**

```ts
// apps/api/src/modules/documents/application/use-cases/request-document.use-case.ts
import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { DocumentTypePriceRepositoryPort } from '../ports/document-type-price.repository.port';
import { DocumentRequest, DeliveryMethod } from '../../domain/entities/document-request.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';
import { IssueDocumentUseCase } from './issue-document.use-case';
import { CreateChargeUseCase } from '../../../finance/application/use-cases/create-charge.use-case';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface RequestDocumentInput {
  enrollmentId: string;
  type: DocumentType;
  deliveryMethod: DeliveryMethod;
  note?: string;
}

const TYPE_LABELS: Record<DocumentType, string> = {
  constancia_matricula: 'Constancia de matrícula',
  certificado_notas: 'Certificado de notas',
  constancia_buena_conducta: 'Constancia de buena conducta',
  otro: 'Documento',
};

@Injectable()
export class RequestDocumentUseCase {
  constructor(
    @Inject(DocumentRequestRepositoryPort) private readonly documentRequests: DocumentRequestRepositoryPort,
    @Inject(DocumentTypePriceRepositoryPort) private readonly prices: DocumentTypePriceRepositoryPort,
    private readonly issueDocument: IssueDocumentUseCase,
    private readonly createCharge: CreateChargeUseCase,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(input: RequestDocumentInput, currentUser: JwtPayload): Promise<DocumentRequest> {
    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    if (allowedEnrollmentIds !== null && !allowedEnrollmentIds.has(input.enrollmentId)) {
      throw new ForbiddenException('No tenés acceso a esta matrícula');
    }

    const price = await this.prices.findByType(input.type);
    const amount = price?.amount ?? 0;
    const today = new Date().toISOString().slice(0, 10);
    const label = TYPE_LABELS[input.type];

    const request = new DocumentRequest(
      randomUUID(),
      input.enrollmentId,
      input.type,
      input.deliveryMethod,
      input.note ?? null,
      currentUser.sub,
      new Date().toISOString(),
      'pendiente_pago',
    );

    if (amount > 0) {
      const charge = await this.createCharge.execute({
        enrollmentId: input.enrollmentId,
        concept: 'documento',
        description: label,
        amount,
        dueDate: today,
      });
      request.chargeId = charge.id;
    } else {
      const issuedDocument = await this.issueDocument.execute({
        enrollmentId: input.enrollmentId,
        type: input.type,
        description: label,
        issuedAt: today,
        issuedBy: currentUser.sub,
      });
      request.markReady(issuedDocument.id);
    }

    await this.documentRequests.save(request);
    return request;
  }
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest request-document.use-case.spec.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Endpoint en el controller**

Agregar a `documents.controller.ts`:

```ts
import { RequestDocumentUseCase } from '../../application/use-cases/request-document.use-case';
import { RequestDocumentDto } from '../dtos/request-document.dto';
```

Al constructor:

```ts
    private readonly requestDocument: RequestDocumentUseCase,
```

Y el endpoint:

```ts
  @Post('requests')
  @CheckPolicies((ability) => ability.can('create', 'DocumentRequest'))
  async request(@Body() dto: RequestDocumentDto, @CurrentUser() user: JwtPayload) {
    return this.requestDocument.execute(dto, user);
  }
```

- [ ] **Step 7: Wiring circular `DocumentsModule` ↔ `FinanceModule`**

En `apps/api/src/modules/documents/documents.module.ts`, agregar:

```ts
import { forwardRef } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { RequestDocumentUseCase } from './application/use-cases/request-document.use-case';
```

Cambiar `imports: [EnrollmentModule, IdentityModule]` por:

```ts
  imports: [EnrollmentModule, IdentityModule, forwardRef(() => FinanceModule)],
```

Y agregar `RequestDocumentUseCase` al array `providers`.

En `apps/api/src/modules/finance/finance.module.ts`, agregar:

```ts
import { forwardRef } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
```

Cambiar `imports: [EnrollmentModule, IdentityModule, AcademicModule, PlatformModule, EmailModule]` por:

```ts
  imports: [EnrollmentModule, IdentityModule, AcademicModule, PlatformModule, EmailModule, forwardRef(() => DocumentsModule)],
```

Y agregar `CreateChargeUseCase` al array `exports` de `FinanceModule` si todavía no está (revisar el archivo — si `FinanceModule` no tiene `exports` hoy, agregar `exports: [CreateChargeUseCase]`).

- [ ] **Step 8: Typecheck**

Run: `cd apps/api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 9: Boot real de Nest para confirmar que el ciclo `forwardRef()` resuelve**

Crear un archivo temporal `apps/api/src/di-smoke-check.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  console.log('DI_SMOKE_CHECK_OK');
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('DI_SMOKE_CHECK_FAILED', err);
  process.exit(1);
});
```

Run (con las variables de entorno del `.env` de `apps/api` cargadas, y Postgres/Redis corriendo):
```bash
cd apps/api && npx ts-node src/di-smoke-check.ts
```
Expected: imprime `DI_SMOKE_CHECK_OK` y sale con código 0. Si falla con "Nest cannot create the X instance... circular dependency", revisar qué módulo comparte `DocumentsModule` y `FinanceModule` además de `EnrollmentModule`/`IdentityModule` — puede hacer falta `forwardRef()` también ahí (mismo problema que apareció con `EnrollmentModule` en la feature de clase virtual).

Borrar el archivo temporal después de confirmar: `rm apps/api/src/di-smoke-check.ts`.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/documents apps/api/src/modules/finance/finance.module.ts
git commit -m "feat(documents): solicitud de documento — gratis se genera al toque, con costo crea el cargo"
```

---

## Task 6: `CompleteDocumentPaymentUseCase` — el gancho de pago

**Files:**
- Create: `apps/api/src/modules/documents/application/use-cases/complete-document-payment.use-case.ts`
- Create: `apps/api/src/modules/documents/application/use-cases/complete-document-payment.use-case.spec.ts`
- Modify: `apps/api/src/modules/documents/documents.module.ts`
- Modify: `apps/api/src/modules/finance/application/use-cases/handle-payment-webhook.use-case.ts`
- Modify: `apps/api/src/modules/finance/finance.module.ts`

**Interfaces:**
- Consumes: `IssueDocumentUseCase`, `DocumentRequestRepositoryPort`, `CreateNotificationUseCase` (de `notifications`), `UserRepositoryPort`.
- Produces: `CompleteDocumentPaymentUseCase.execute(chargeId: string): Promise<void>` — lo exporta `DocumentsModule` para que `finance` lo use.

- [ ] **Step 1: Escribir el test**

```ts
// apps/api/src/modules/documents/application/use-cases/complete-document-payment.use-case.spec.ts
import { CompleteDocumentPaymentUseCase } from './complete-document-payment.use-case';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { DocumentRequest } from '../../domain/entities/document-request.entity';
import { IssueDocumentUseCase } from './issue-document.use-case';
import { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { IssuedDocument } from '../../domain/entities/issued-document.entity';
import { User } from '../../../identity/domain/entities/user.entity';

describe('CompleteDocumentPaymentUseCase', () => {
  const documentRequests: jest.Mocked<DocumentRequestRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByChargeId: jest.fn(),
    save: jest.fn(),
  };
  const issueDocument = { execute: jest.fn() } as unknown as jest.Mocked<IssueDocumentUseCase>;
  const createNotification = { execute: jest.fn() } as unknown as jest.Mocked<CreateNotificationUseCase>;
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new CompleteDocumentPaymentUseCase(documentRequests, issueDocument, createNotification, users);

  function staffUser(id: string, role: string): User {
    return {
      id,
      email: `${id}@x.com`,
      roles: [role as never],
    } as User;
  }

  beforeEach(() => jest.clearAllMocks());

  it('no hace nada si el cargo no tiene una solicitud de documento asociada', async () => {
    documentRequests.findByChargeId.mockResolvedValue(null);
    await useCase.execute('charge-1');
    expect(issueDocument.execute).not.toHaveBeenCalled();
  });

  it('genera el documento y marca la solicitud lista (digital) sin notificar a nadie', async () => {
    const request = new DocumentRequest(
      'req-1', 'enrollment-1', 'certificado_notas', 'digital', null, 'padre-1',
      '2026-09-11T00:00:00.000Z', 'pendiente_pago', 'charge-1',
    );
    documentRequests.findByChargeId.mockResolvedValue(request);
    issueDocument.execute.mockResolvedValue(
      new IssuedDocument('doc-1', 'enrollment-1', 'certificado_notas', 'Certificado de notas', '2026-09-11', 'padre-1'),
    );

    await useCase.execute('charge-1');

    expect(documentRequests.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'lista' }));
    expect(createNotification.execute).not.toHaveBeenCalled();
  });

  it('genera el documento, marca lista_para_imprimir y notifica a admin/directivo/secretaria (físico)', async () => {
    const request = new DocumentRequest(
      'req-1', 'enrollment-1', 'certificado_notas', 'fisico', null, 'padre-1',
      '2026-09-11T00:00:00.000Z', 'pendiente_pago', 'charge-1',
    );
    documentRequests.findByChargeId.mockResolvedValue(request);
    issueDocument.execute.mockResolvedValue(
      new IssuedDocument('doc-1', 'enrollment-1', 'certificado_notas', 'Certificado de notas', '2026-09-11', 'padre-1'),
    );
    users.findAll.mockResolvedValue({
      items: [staffUser('admin-1', 'admin_institucion'), staffUser('sec-1', 'secretaria')],
      total: 2,
    });

    await useCase.execute('charge-1');

    expect(documentRequests.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'lista_para_imprimir' }));
    expect(createNotification.execute).toHaveBeenCalledTimes(2);
    expect(createNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 'admin-1', type: 'document_request_ready_to_print' }),
    );
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd apps/api && npx jest complete-document-payment.use-case.spec.ts`
Expected: FAIL — `Cannot find module './complete-document-payment.use-case'`

- [ ] **Step 3: Implementar**

```ts
// apps/api/src/modules/documents/application/use-cases/complete-document-payment.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { IssueDocumentUseCase } from './issue-document.use-case';
import { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { UserRole } from '../../../identity/domain/entities/user.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';

const TYPE_LABELS: Record<DocumentType, string> = {
  constancia_matricula: 'Constancia de matrícula',
  certificado_notas: 'Certificado de notas',
  constancia_buena_conducta: 'Constancia de buena conducta',
  otro: 'Documento',
};

const STAFF_ROLES: UserRole[] = ['admin_institucion', 'directivo', 'secretaria'];

@Injectable()
export class CompleteDocumentPaymentUseCase {
  constructor(
    @Inject(DocumentRequestRepositoryPort) private readonly documentRequests: DocumentRequestRepositoryPort,
    private readonly issueDocument: IssueDocumentUseCase,
    private readonly createNotification: CreateNotificationUseCase,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
  ) {}

  async execute(chargeId: string): Promise<void> {
    const request = await this.documentRequests.findByChargeId(chargeId);
    if (!request) return;

    const issuedDocument = await this.issueDocument.execute({
      enrollmentId: request.enrollmentId,
      type: request.type,
      description: TYPE_LABELS[request.type],
      issuedAt: new Date().toISOString().slice(0, 10),
      issuedBy: request.requestedBy,
    });

    request.markReady(issuedDocument.id);
    await this.documentRequests.save(request);

    if (request.deliveryMethod === 'fisico') {
      await this.notifyStaff();
    }
  }

  private async notifyStaff(): Promise<void> {
    const recipients = new Map<string, true>();
    for (const role of STAFF_ROLES) {
      const { items } = await this.users.findAll({ role });
      items.forEach((u) => recipients.set(u.id, true));
    }

    await Promise.all(
      Array.from(recipients.keys()).map((recipientUserId) =>
        this.createNotification.execute({
          recipientUserId,
          type: 'document_request_ready_to_print',
          title: 'Documento listo para imprimir',
          body: 'Hay una solicitud de documento pagada, lista para imprimir y entregar.',
          link: '/documents?tab=solicitudes',
        }),
      ),
    );
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest complete-document-payment.use-case.spec.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Wiring — `DocumentsModule` importa `NotificationsModule`, exporta `CompleteDocumentPaymentUseCase`**

En `documents.module.ts`, agregar:

```ts
import { NotificationsModule } from '../notifications/notifications.module';
import { CompleteDocumentPaymentUseCase } from './application/use-cases/complete-document-payment.use-case';
```

Agregar `NotificationsModule` al array `imports` (junto a `EnrollmentModule, IdentityModule, forwardRef(() => FinanceModule)` — sin `forwardRef`, no hay ciclo con `notifications`).

Agregar `CompleteDocumentPaymentUseCase` al array `providers`, y agregar (o crear) el array `exports: [CompleteDocumentPaymentUseCase]`.

- [ ] **Step 6: Hook en `HandlePaymentWebhookUseCase`**

Reemplazar el contenido completo de `apps/api/src/modules/finance/application/use-cases/handle-payment-webhook.use-case.ts` por:

```ts
import { randomUUID } from 'node:crypto';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PaymentAttemptRepositoryPort } from '../ports/payment-attempt.repository.port';
import { RecordApprovedPaymentPort } from '../ports/record-approved-payment.port';
import { PaymentGatewayPort } from '../ports/payment-gateway.port';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { Payment, PaymentMethod } from '../../domain/entities/payment.entity';
import { CompleteDocumentPaymentUseCase } from '../../../documents/application/use-cases/complete-document-payment.use-case';

export interface PaymentWebhookInput {
  event?: string;
  data?: { transaction?: { id?: string } };
}

function mapPaymentMethod(wompiPaymentMethodType: string): PaymentMethod {
  if (['BANCOLOMBIA_COLLECT'].includes(wompiPaymentMethodType)) return 'efectivo';
  if (['PSE', 'BANCOLOMBIA_TRANSFER', 'NEQUI', 'DAVIPLATA'].includes(wompiPaymentMethodType)) {
    return 'transferencia';
  }
  if (['CARD'].includes(wompiPaymentMethodType)) return 'tarjeta';
  return 'otro';
}

/**
 * Los webhooks de Wompi son solo una notificación ("algo pasó con el pago
 * X") — hay que consultar la API para saber el estado real. Es idempotente:
 * un webhook puede reintentarse, así que solo crea el `Payment` si el
 * intento todavía no fue marcado `approved`.
 *
 * Cuando el cargo pagado es de concepto `documento` y queda saldado, dispara
 * `CompleteDocumentPaymentUseCase` — mismo patrón que el resto de la app
 * usa para efectos secundarios sobre un cambio de estado (ver
 * SetScheduleVirtualUseCase → PublishAnnouncementUseCase).
 */
@Injectable()
export class HandlePaymentWebhookUseCase {
  private readonly logger = new Logger(HandlePaymentWebhookUseCase.name);

  constructor(
    @Inject(PaymentAttemptRepositoryPort) private readonly attempts: PaymentAttemptRepositoryPort,
    @Inject(RecordApprovedPaymentPort) private readonly recordApprovedPayment: RecordApprovedPaymentPort,
    @Inject(PaymentGatewayPort) private readonly gateway: PaymentGatewayPort,
    @Inject(ChargeRepositoryPort) private readonly charges: ChargeRepositoryPort,
    @Inject(PaymentRepositoryPort) private readonly payments: PaymentRepositoryPort,
    @Inject(forwardRef(() => CompleteDocumentPaymentUseCase))
    private readonly completeDocumentPayment: CompleteDocumentPaymentUseCase,
  ) {}

  async execute(input: PaymentWebhookInput): Promise<void> {
    const transactionId = input.data?.transaction?.id;
    if (input.event !== 'transaction.updated' || !transactionId) return;

    const info = await this.gateway.getPaymentInfo(transactionId);
    if (!info.externalReference) return;

    const attempt = await this.attempts.findById(info.externalReference);
    if (!attempt) {
      this.logger.warn(`Webhook para un intento de pago desconocido: ${info.externalReference}`);
      return;
    }

    if (attempt.status === 'approved') return; // ya procesado, evita duplicar el Payment

    if (info.status === 'approved') {
      const payment = new Payment(
        randomUUID(),
        attempt.chargeId,
        attempt.amount,
        mapPaymentMethod(info.paymentMethodId),
        new Date().toISOString().slice(0, 10),
        `wompi:${transactionId}`,
      );
      attempt.approve();
      await this.recordApprovedPayment.execute(payment, attempt);
      await this.checkDocumentChargeCompleted(attempt.chargeId);
    } else if (info.status === 'rejected') {
      attempt.reject();
      await this.attempts.save(attempt);
    }
  }

  private async checkDocumentChargeCompleted(chargeId: string): Promise<void> {
    const charge = await this.charges.findById(chargeId);
    if (!charge || charge.concept !== 'documento') return;

    const payments = await this.payments.findAll({ chargeId });
    const paidAmount = payments.filter((p) => !p.voidedAt).reduce((sum, p) => sum + p.amount, 0);
    const balance = charge.amount - charge.discountAmount - paidAmount;
    if (balance <= 0) {
      await this.completeDocumentPayment.execute(chargeId);
    }
  }
}
```

`ChargeRepositoryPort` y `PaymentRepositoryPort` ya están registrados como providers en `FinanceModule` (los usa `CreatePaymentCheckoutUseCase`) — `HandlePaymentWebhookUseCase` los recibe por DI normal, sin tocar el módulo para eso.

- [ ] **Step 7: Actualizar el spec existente de `HandlePaymentWebhookUseCase`**

El archivo `apps/api/src/modules/finance/application/use-cases/handle-payment-webhook.use-case.spec.ts` ya existe e instancia `new HandlePaymentWebhookUseCase(attempts, recordApprovedPayment, gateway)` con 3 argumentos — ahora el constructor toma 6. Reemplazar el archivo completo por:

```ts
import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case';
import { PaymentAttemptRepositoryPort } from '../ports/payment-attempt.repository.port';
import { RecordApprovedPaymentPort } from '../ports/record-approved-payment.port';
import { PaymentGatewayPort } from '../ports/payment-gateway.port';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { PaymentAttempt } from '../../domain/entities/payment-attempt.entity';
import { Payment } from '../../domain/entities/payment.entity';
import { Charge } from '../../domain/entities/charge.entity';
import { CompleteDocumentPaymentUseCase } from '../../../documents/application/use-cases/complete-document-payment.use-case';

describe('HandlePaymentWebhookUseCase', () => {
  const attempts: jest.Mocked<PaymentAttemptRepositoryPort> = {
    findById: jest.fn(),
    save: jest.fn(),
  };
  const recordApprovedPayment: jest.Mocked<RecordApprovedPaymentPort> = {
    execute: jest.fn(),
  };
  const gateway: jest.Mocked<PaymentGatewayPort> = {
    createCheckoutPreference: jest.fn(),
    getPaymentInfo: jest.fn(),
  };
  const charges: jest.Mocked<ChargeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const payments: jest.Mocked<PaymentRepositoryPort> = {
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const completeDocumentPayment = { execute: jest.fn() } as unknown as jest.Mocked<CompleteDocumentPaymentUseCase>;

  const useCase = new HandlePaymentWebhookUseCase(
    attempts,
    recordApprovedPayment,
    gateway,
    charges,
    payments,
    completeDocumentPayment,
  );

  const pendingAttempt = () =>
    new PaymentAttempt('att-1', 'charge-1', 'guardian-1', 'pref-1', 100, 'pending', '2026-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    charges.findById.mockResolvedValue(null);
    payments.findAll.mockResolvedValue([]);
  });

  it('ignora notificaciones que no son de tipo transaction.updated', async () => {
    await useCase.execute({ event: 'transaction.created', data: { transaction: { id: '1' } } });

    expect(gateway.getPaymentInfo).not.toHaveBeenCalled();
  });

  it('ignora si el intento de pago no existe', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-unknown',
    });
    attempts.findById.mockResolvedValue(null);

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(recordApprovedPayment.execute).not.toHaveBeenCalled();
    expect(attempts.save).not.toHaveBeenCalled();
  });

  it('es idempotente: no vuelve a registrar el pago si el intento ya está aprobado', async () => {
    const approved = pendingAttempt();
    approved.approve();
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(approved);

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(recordApprovedPayment.execute).not.toHaveBeenCalled();
    expect(attempts.save).not.toHaveBeenCalled();
  });

  it('registra el pago y aprueba el intento de forma atómica cuando el gateway confirma el pago', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(pendingAttempt());

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(recordApprovedPayment.execute).toHaveBeenCalledTimes(1);
    const [payment, attempt] = recordApprovedPayment.execute.mock.calls[0] as [Payment, PaymentAttempt];
    expect(payment.chargeId).toBe('charge-1');
    expect(payment.amount).toBe(100);
    expect(attempt.status).toBe('approved');
    // el rechazo por separado no debe tocar la ruta transaccional de pago aprobado
    expect(attempts.save).not.toHaveBeenCalled();
  });

  it('marca el intento como rechazado sin registrar ningún pago cuando el gateway lo rechaza', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'rejected',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(pendingAttempt());

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(recordApprovedPayment.execute).not.toHaveBeenCalled();
    expect(attempts.save).toHaveBeenCalledTimes(1);
    const [savedAttempt] = attempts.save.mock.calls[0] as [PaymentAttempt];
    expect(savedAttempt.status).toBe('rejected');
  });

  it('no dispara CompleteDocumentPaymentUseCase si el cargo pagado no es de concepto documento', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(pendingAttempt());
    charges.findById.mockResolvedValue(new Charge('charge-1', 'enrollment-1', 'pension', 'Pensión', 100, '2026-09-11'));

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(completeDocumentPayment.execute).not.toHaveBeenCalled();
  });

  it('dispara CompleteDocumentPaymentUseCase cuando un cargo de concepto documento queda saldado', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(pendingAttempt());
    charges.findById.mockResolvedValue(
      new Charge('charge-1', 'enrollment-1', 'documento', 'Certificado de notas', 100, '2026-09-11'),
    );
    payments.findAll.mockResolvedValue([
      new Payment('pay-1', 'charge-1', 100, 'tarjeta', '2026-09-11', 'wompi:txn-1'),
    ]);

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(completeDocumentPayment.execute).toHaveBeenCalledWith('charge-1');
  });

  it('NO dispara CompleteDocumentPaymentUseCase si el cargo de documento queda con saldo pendiente', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(pendingAttempt());
    charges.findById.mockResolvedValue(
      new Charge('charge-1', 'enrollment-1', 'documento', 'Certificado de notas', 200, '2026-09-11'),
    );
    payments.findAll.mockResolvedValue([
      new Payment('pay-1', 'charge-1', 100, 'tarjeta', '2026-09-11', 'wompi:txn-1'),
    ]);

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(completeDocumentPayment.execute).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 8: Correr el test y verificar que pasa**

Run: `cd apps/api && npx jest handle-payment-webhook.use-case.spec.ts`
Expected: PASS — 8 tests.

- [ ] **Step 9: Typecheck + boot real de Nest otra vez**

Run: `cd apps/api && npx tsc --noEmit`
Expected: sin errores.

Repetir el smoke check del Task 5 (Step 9) — recrear `apps/api/src/di-smoke-check.ts`, correrlo, confirmar `DI_SMOKE_CHECK_OK`, borrarlo. Este paso es crítico acá: `HandlePaymentWebhookUseCase` ahora depende de `CompleteDocumentPaymentUseCase` (vía `forwardRef`), que a su vez vive en `DocumentsModule` — que ya depende de `FinanceModule` desde el Task 5. Confirmar que el ciclo de 2 nodos sigue resolviendo con esta arista nueva.

- [ ] **Step 10: Correr el test suite completo del backend**

Run: `cd apps/api && npx jest`
Expected: todos los tests pasan (los actualizados/nuevos de este Task más los ~490 existentes).

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/modules/documents apps/api/src/modules/finance
git commit -m "feat(finance): al saldar un cargo de documento, generarlo y avisar a secretaría si es físico"
```

---

## Task 7: Cola de solicitudes — listar, rechazar, marcar entregado + CASL

**Files:**
- Create: `apps/api/src/modules/documents/application/use-cases/list-document-requests.use-case.ts`
- Create: `apps/api/src/modules/documents/application/use-cases/reject-document-request.use-case.ts`
- Create: `apps/api/src/modules/documents/application/use-cases/mark-document-request-delivered.use-case.ts`
- Create: `apps/api/src/modules/documents/interface/dtos/reject-document-request.dto.ts`
- Create: `apps/api/src/modules/documents/interface/dtos/list-document-requests-query.dto.ts`
- Modify: `apps/api/src/modules/documents/interface/controllers/documents.controller.ts`
- Modify: `apps/api/src/modules/documents/documents.module.ts`
- Modify: `apps/api/src/core/auth/casl/ability.factory.ts`
- Modify: `apps/api/src/core/auth/casl/ability.factory.spec.ts`

**Interfaces:**
- Consumes: `EnrollmentAccessService`, `DocumentRequestRepositoryPort`.
- Produces: `GET /documents/requests`, `PATCH /documents/requests/:id/reject`, `PATCH /documents/requests/:id/deliver`.

- [ ] **Step 1: Casos de uso (sin test unitario nuevo — son composición directa de piezas ya probadas en Task 1/2; se prueban en conjunto con la verificación en vivo del Task 13)**

```ts
// apps/api/src/modules/documents/application/use-cases/list-document-requests.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { DocumentRequest, DocumentRequestStatus } from '../../domain/entities/document-request.entity';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class ListDocumentRequestsUseCase {
  constructor(
    @Inject(DocumentRequestRepositoryPort) private readonly documentRequests: DocumentRequestRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(currentUser: JwtPayload, status?: DocumentRequestStatus): Promise<DocumentRequest[]> {
    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    return this.documentRequests.findAll({
      enrollmentIds: allowedEnrollmentIds ? Array.from(allowedEnrollmentIds) : undefined,
      status,
    });
  }
}
```

```ts
// apps/api/src/modules/documents/application/use-cases/reject-document-request.use-case.ts
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { DocumentRequest } from '../../domain/entities/document-request.entity';

@Injectable()
export class RejectDocumentRequestUseCase {
  constructor(
    @Inject(DocumentRequestRepositoryPort) private readonly documentRequests: DocumentRequestRepositoryPort,
  ) {}

  async execute(id: string, reason: string, staffUserId: string): Promise<DocumentRequest> {
    const request = await this.documentRequests.findById(id);
    if (!request) {
      throw new NotFoundException(`No existe la solicitud "${id}"`);
    }
    try {
      request.reject(staffUserId, reason);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    await this.documentRequests.save(request);
    return request;
  }
}
```

```ts
// apps/api/src/modules/documents/application/use-cases/mark-document-request-delivered.use-case.ts
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { DocumentRequest } from '../../domain/entities/document-request.entity';

@Injectable()
export class MarkDocumentRequestDeliveredUseCase {
  constructor(
    @Inject(DocumentRequestRepositoryPort) private readonly documentRequests: DocumentRequestRepositoryPort,
  ) {}

  async execute(id: string, staffUserId: string): Promise<DocumentRequest> {
    const request = await this.documentRequests.findById(id);
    if (!request) {
      throw new NotFoundException(`No existe la solicitud "${id}"`);
    }
    try {
      request.markDelivered(staffUserId);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    await this.documentRequests.save(request);
    return request;
  }
}
```

- [ ] **Step 2: DTOs**

```ts
// apps/api/src/modules/documents/interface/dtos/reject-document-request.dto.ts
import { IsString, MinLength } from 'class-validator';

export class RejectDocumentRequestDto {
  @IsString()
  @MinLength(1)
  reason: string;
}
```

```ts
// apps/api/src/modules/documents/interface/dtos/list-document-requests-query.dto.ts
import { IsIn, IsOptional } from 'class-validator';
import { DocumentRequestStatus } from '../../domain/entities/document-request.entity';

const KNOWN_STATUSES: DocumentRequestStatus[] = [
  'pendiente_pago',
  'lista_para_imprimir',
  'lista',
  'entregada',
  'rechazada',
];

export class ListDocumentRequestsQueryDto {
  @IsOptional()
  @IsIn(KNOWN_STATUSES)
  status?: DocumentRequestStatus;
}
```

- [ ] **Step 3: Endpoints**

Agregar a `documents.controller.ts`:

```ts
import { ListDocumentRequestsUseCase } from '../../application/use-cases/list-document-requests.use-case';
import { RejectDocumentRequestUseCase } from '../../application/use-cases/reject-document-request.use-case';
import { MarkDocumentRequestDeliveredUseCase } from '../../application/use-cases/mark-document-request-delivered.use-case';
import { RejectDocumentRequestDto } from '../dtos/reject-document-request.dto';
import { ListDocumentRequestsQueryDto } from '../dtos/list-document-requests-query.dto';
```

Al constructor:

```ts
    private readonly listDocumentRequests: ListDocumentRequestsUseCase,
    private readonly rejectDocumentRequest: RejectDocumentRequestUseCase,
    private readonly markDocumentRequestDelivered: MarkDocumentRequestDeliveredUseCase,
```

Endpoints:

```ts
  @Get('requests')
  async listRequests(@Query() query: ListDocumentRequestsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listDocumentRequests.execute(user, query.status);
  }

  @Patch('requests/:id/reject')
  @CheckPolicies((ability) => ability.can('manage', 'DocumentRequest'))
  async rejectRequest(@Param('id') id: string, @Body() dto: RejectDocumentRequestDto, @CurrentUser() user: JwtPayload) {
    return this.rejectDocumentRequest.execute(id, dto.reason, user.sub);
  }

  @Patch('requests/:id/deliver')
  @CheckPolicies((ability) => ability.can('manage', 'DocumentRequest'))
  async deliverRequest(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.markDocumentRequestDelivered.execute(id, user.sub);
  }
```

- [ ] **Step 4: Registrar en `documents.module.ts`**

Agregar los 3 use-cases nuevos al array `providers`.

- [ ] **Step 5: CASL — `ability.factory.ts`**

En el bloque de `directivo` (línea ~31-54, dentro del array de `can('manage', [...])`), agregar `'DocumentRequest'` junto a `'Document'`.

En el bloque de `secretaria` (línea ~89), agregar `'DocumentRequest'` junto a `'Document'`:

```ts
      can('manage', ['Finance', 'Hr', 'Document', 'DocumentRequest', 'Announcement', 'Event', 'Survey', 'Book', 'Loan', 'Admission']);
```

En el bloque compartido de lectura (línea ~92-113, el `if (roles.some(...))`), agregar `'DocumentRequest'` al array de `can('read', [...])` junto a `'Document'`.

Agregar un bloque nuevo, después del bloque de `padre_tutor` existente (línea ~126-132):

```ts
    if (roles.some((role) => ['estudiante', 'padre_tutor'].includes(role))) {
      // A diferencia de GuardianLink (solo padre_tutor), acá ambos roles
      // pueden pedir un documento — un estudiante puede pedir el suyo
      // propio sin depender de que lo haga su acudiente.
      can('create', 'DocumentRequest');
    }
```

- [ ] **Step 6: Tests de CASL**

Agregar a `ability.factory.spec.ts` (siguiendo el estilo de los tests existentes, después del último `it(...)`):

```ts
  it('estudiante y padre_tutor pueden create DocumentRequest, docente no', () => {
    expect(factory.createForUser(payload(['estudiante'])).can('create', 'DocumentRequest')).toBe(true);
    expect(factory.createForUser(payload(['padre_tutor'])).can('create', 'DocumentRequest')).toBe(true);
    expect(factory.createForUser(payload(['docente'])).can('create', 'DocumentRequest')).toBe(false);
  });

  it('secretaria/directivo pueden manage DocumentRequest, docente/estudiante solo read', () => {
    expect(factory.createForUser(payload(['secretaria'])).can('manage', 'DocumentRequest')).toBe(true);
    expect(factory.createForUser(payload(['directivo'])).can('manage', 'DocumentRequest')).toBe(true);
    expect(factory.createForUser(payload(['docente'])).can('manage', 'DocumentRequest')).toBe(false);
    expect(factory.createForUser(payload(['docente'])).can('read', 'DocumentRequest')).toBe(true);
    expect(factory.createForUser(payload(['estudiante'])).can('read', 'DocumentRequest')).toBe(true);
  });
```

- [ ] **Step 7: Correr los tests de CASL**

Run: `cd apps/api && npx jest ability.factory.spec.ts`
Expected: PASS — todos los tests existentes más los 2 nuevos.

- [ ] **Step 8: Typecheck + test suite completo**

Run: `cd apps/api && npx tsc --noEmit && npx jest`
Expected: sin errores, todos los tests pasan.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/documents apps/api/src/core/auth/casl
git commit -m "feat(documents): cola de solicitudes — listar, rechazar y marcar entregado"
```

---

## Task 8: `shared-types` — tipos nuevos para el frontend

**Files:**
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Produces: `DocumentTypePrice`, `DocumentRequestStatus`, `DeliveryMethod`, `DocumentRequest`, `Notification` — usados por todos los hooks del frontend en las tareas siguientes.

- [ ] **Step 1: Agregar los tipos**

Justo después de la definición de `IssuedDocument` (que termina con el `}` de la línea 323 vista durante el diseño), agregar:

```ts
export interface DocumentTypePrice {
  type: DocumentType;
  amount: number;
}

export type DocumentRequestStatus =
  | 'pendiente_pago'
  | 'lista_para_imprimir'
  | 'lista'
  | 'entregada'
  | 'rechazada';

export type DeliveryMethod = 'digital' | 'fisico';

export interface DocumentRequest {
  id: string;
  enrollmentId: string;
  type: DocumentType;
  deliveryMethod: DeliveryMethod;
  note: string | null;
  requestedBy: string;
  requestedAt: string;
  status: DocumentRequestStatus;
  chargeId: string | null;
  issuedDocumentId: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  rejectionReason: string | null;
}

export interface Notification {
  id: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  link: string;
  createdAt: string;
  readAt: string | null;
}
```

- [ ] **Step 2: Typecheck del paquete y de ambas apps**

Run: `cd packages/shared-types && npx tsc --noEmit`
Run: `cd apps/api && npx tsc --noEmit`
Run: `cd apps/web && npx tsc --noEmit`
Expected: sin errores en los tres.

- [ ] **Step 3: Commit**

```bash
git add packages/shared-types/src/index.ts
git commit -m "feat(shared-types): tipos para DocumentRequest, DocumentTypePrice y Notification"
```

---

## Task 9: Frontend — sistema de notificaciones (hook + campana + BFF)

**Files:**
- Create: `apps/web/src/app/api/notifications/route.ts`
- Create: `apps/web/src/app/api/notifications/unread-count/route.ts`
- Create: `apps/web/src/app/api/notifications/read-all/route.ts`
- Create: `apps/web/src/app/api/notifications/[id]/read/route.ts`
- Create: `apps/web/src/features/notifications/use-notifications.ts`
- Create: `apps/web/src/features/notifications/components/notification-bell.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`

**Interfaces:**
- Produces: `useNotifications()`, `useUnreadNotificationCount()`, `useMarkNotificationRead()`, `useMarkAllNotificationsRead()`. Componente `<NotificationBell />` sin props.

- [ ] **Step 1: BFF routes**

```ts
// apps/web/src/app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Notification } from '@eduapp/shared-types';

export async function GET() {
  const notifications = await serverApiFetch<Notification[]>('/notifications');
  if (notifications === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(notifications);
}
```

```ts
// apps/web/src/app/api/notifications/unread-count/route.ts
import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';

export async function GET() {
  const result = await serverApiFetch<{ count: number }>('/notifications/unread-count');
  if (result === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(result);
}
```

```ts
// apps/web/src/app/api/notifications/read-all/route.ts
import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';

export async function PATCH() {
  const result = await serverApiFetch<{ ok: boolean }>('/notifications/read-all', { method: 'PATCH' });
  if (result === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(result);
}
```

```ts
// apps/web/src/app/api/notifications/[id]/read/route.ts
import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Notification } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const notification = await serverApiFetch<Notification>(`/notifications/${params.id}/read`, { method: 'PATCH' });
  if (notification === null) {
    return NextResponse.json({ message: 'No se pudo marcar como leída' }, { status: 400 });
  }
  return NextResponse.json(notification);
}
```

- [ ] **Step 2: Hook**

```ts
// apps/web/src/features/notifications/use-notifications.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Notification } from '@eduapp/shared-types';

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch('/api/notifications');
  if (!res.ok) throw new Error('No se pudieron cargar las notificaciones');
  return res.json();
}

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch('/api/notifications/unread-count');
  if (!res.ok) throw new Error('No se pudo obtener el conteo de no leídas');
  const data = await res.json();
  return data.count;
}

async function markRead(id: string): Promise<Notification> {
  const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo marcar como leída');
  return res.json();
}

async function markAllRead(): Promise<void> {
  const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudieron marcar como leídas');
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 20000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 20000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}
```

- [ ] **Step 3: Componente `NotificationBell`**

```tsx
// apps/web/src/features/notifications/components/notification-bell.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../use-notifications';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  function handleClickNotification(id: string, link: string, readAt: string | null) {
    if (!readAt) markRead.mutate(id);
    setOpen(false);
    router.push(link);
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        className="relative h-9 w-9 shrink-0 p-0"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        {!!unreadCount && unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 rounded border border-border bg-surface p-2 shadow-lg">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-medium">Notificaciones</span>
              {!!unreadCount && unreadCount > 0 && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => markAllRead.mutate()}
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!notifications || notifications.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">Sin notificaciones.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClickNotification(n.id, n.link, n.readAt)}
                    className={cn(
                      'block w-full rounded px-2 py-2 text-left transition-colors hover:bg-muted',
                      !n.readAt && 'bg-primary/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.readAt && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(n.createdAt)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wiring en el header del dashboard**

En `apps/web/src/app/(dashboard)/layout.tsx`, agregar el import:

```ts
import { NotificationBell } from '@/components/notifications/notification-bell';
```

(usar la ruta real del archivo creado en el Step 3 — `@/features/notifications/components/notification-bell`).

Y agregar `<NotificationBell />` dentro del `<div className="flex items-center gap-3">` del header, antes de `<ThemeToggle />`.

- [ ] **Step 5: Verificación visual en vivo**

Con `preview_start` (`web`), loguearse como cualquier usuario y confirmar que la campana aparece en el header, se abre/cierra al hacer clic, y muestra "Sin notificaciones." (todavía no hay ninguna generada). Confirmar en Network que `GET /api/notifications` y `GET /api/notifications/unread-count` devuelven 200.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/notifications apps/web/src/features/notifications "apps/web/src/app/(dashboard)/layout.tsx"
git commit -m "feat(notifications): campana de notificaciones en el header"
```

---

## Task 10: Frontend — solicitar documento desde el portal

**Files:**
- Create: `apps/web/src/app/api/documents/types/prices/route.ts`
- Create: `apps/web/src/app/api/documents/requests/route.ts`
- Create: `apps/web/src/features/documents/use-document-requests.ts`
- Create: `apps/web/src/features/documents/components/request-document-form.tsx`
- Modify: `apps/web/src/features/portal/components/child-summary-card.tsx`
- Modify: `apps/web/src/features/portal/components/portal-view.tsx`

**Interfaces:**
- Produces: `useDocumentTypePrices()`, `useDocumentRequests()`, `useRequestDocument()`. Componente `<RequestDocumentForm enrollmentId={string} />`.

- [ ] **Step 1: BFF routes**

```ts
// apps/web/src/app/api/documents/types/prices/route.ts
import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { DocumentTypePrice } from '@eduapp/shared-types';

export async function GET() {
  const prices = await serverApiFetch<DocumentTypePrice[]>('/documents/types/prices');
  if (prices === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(prices);
}
```

```ts
// apps/web/src/app/api/documents/requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { DocumentRequest } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const requests = await serverApiFetch<DocumentRequest[]>(qs ? `/documents/requests?${qs}` : '/documents/requests');
  if (requests === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const request = await serverApiFetch<DocumentRequest>('/documents/requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (request === null) {
    return NextResponse.json({ message: 'No se pudo crear la solicitud' }, { status: 400 });
  }
  return NextResponse.json(request, { status: 201 });
}
```

- [ ] **Step 2: Hook**

```ts
// apps/web/src/features/documents/use-document-requests.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DeliveryMethod, DocumentRequest, DocumentRequestStatus, DocumentType, DocumentTypePrice } from '@eduapp/shared-types';
import { toQueryString } from '@/lib/utils';

async function fetchDocumentTypePrices(): Promise<DocumentTypePrice[]> {
  const res = await fetch('/api/documents/types/prices');
  if (!res.ok) throw new Error('No se pudieron cargar los precios');
  return res.json();
}

export function useDocumentTypePrices() {
  return useQuery({
    queryKey: ['document-type-prices'],
    queryFn: fetchDocumentTypePrices,
  });
}

async function fetchDocumentRequests(status?: DocumentRequestStatus): Promise<DocumentRequest[]> {
  const qs = status ? toQueryString({ status }) : '';
  const res = await fetch(qs ? `/api/documents/requests?${qs}` : '/api/documents/requests');
  if (!res.ok) throw new Error('No se pudieron cargar las solicitudes');
  return res.json();
}

export function useDocumentRequests(status?: DocumentRequestStatus) {
  return useQuery({
    queryKey: ['document-requests', status ?? 'all'],
    queryFn: () => fetchDocumentRequests(status),
  });
}

export interface RequestDocumentInput {
  enrollmentId: string;
  type: DocumentType;
  deliveryMethod: DeliveryMethod;
  note?: string;
}

async function requestDocument(input: RequestDocumentInput): Promise<DocumentRequest> {
  const res = await fetch('/api/documents/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear la solicitud');
  return res.json();
}

export function useRequestDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-requests'] });
      toast.success('Solicitud enviada.');
    },
  });
}

async function rejectDocumentRequest({ id, reason }: { id: string; reason: string }): Promise<DocumentRequest> {
  const res = await fetch(`/api/documents/requests/${id}/reject`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('No se pudo rechazar la solicitud');
  return res.json();
}

export function useRejectDocumentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectDocumentRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-requests'] }),
  });
}

async function deliverDocumentRequest(id: string): Promise<DocumentRequest> {
  const res = await fetch(`/api/documents/requests/${id}/deliver`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo marcar como entregada');
  return res.json();
}

export function useDeliverDocumentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deliverDocumentRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-requests'] }),
  });
}
```

**Nota:** las BFF routes `/api/documents/requests/[id]/reject` y `/api/documents/requests/[id]/deliver` que usa este hook se crean en el Task 11 (son de uso exclusivo de la cola de administración).

- [ ] **Step 3: Formulario de solicitud**

```tsx
// apps/web/src/features/documents/components/request-document-form.tsx
'use client';

import { FormEvent, useState } from 'react';
import type { DeliveryMethod, DocumentType } from '@eduapp/shared-types';
import { useDocumentTypePrices, useRequestDocument } from '../use-document-requests';
import { usePaymentCheckout } from '@/features/finance/use-payment-checkout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/currency';

const TYPES: { value: DocumentType; label: string }[] = [
  { value: 'constancia_matricula', label: 'Constancia de matrícula' },
  { value: 'certificado_notas', label: 'Certificado de notas' },
  { value: 'constancia_buena_conducta', label: 'Constancia de buena conducta' },
  { value: 'otro', label: 'Otro' },
];

export function RequestDocumentForm({ enrollmentId }: { enrollmentId: string }) {
  const { data: prices } = useDocumentTypePrices();
  const requestDocument = useRequestDocument();
  const checkout = usePaymentCheckout();

  const [type, setType] = useState<DocumentType>('constancia_matricula');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('digital');
  const [note, setNote] = useState('');

  const priceForType = prices?.find((p) => p.type === type)?.amount ?? 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    requestDocument.mutate(
      { enrollmentId, type, deliveryMethod, note: note || undefined },
      {
        onSuccess: (request) => {
          setNote('');
          if (request.chargeId) {
            checkout.mutate(request.chargeId);
          }
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      <div className="space-y-1.5">
        <Label htmlFor="request-type">Tipo de documento</Label>
        <select
          id="request-type"
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType)}
          className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {priceForType > 0 ? `Costo: ${formatCurrency(priceForType)}` : 'Sin costo'}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>¿Cómo lo necesitás?</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="deliveryMethod"
              checked={deliveryMethod === 'digital'}
              onChange={() => setDeliveryMethod('digital')}
            />
            PDF digital
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="deliveryMethod"
              checked={deliveryMethod === 'fisico'}
              onChange={() => setDeliveryMethod('fisico')}
            />
            Impreso (retirar en secretaría)
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="request-note">Nota (opcional)</Label>
        <input
          id="request-note"
          placeholder="Para trámite de..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <Button type="submit" disabled={requestDocument.isPending || checkout.isPending}>
        {priceForType > 0 ? 'Solicitar y pagar' : 'Solicitar'}
      </Button>
      {requestDocument.isError && (
        <p className="text-sm text-destructive">No se pudo enviar la solicitud.</p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Wiring en la pestaña "Documentos" del portal de familia**

En `apps/web/src/features/portal/components/child-summary-card.tsx`:

Agregar el import:

```ts
import { useState as useState2 } from 'react'; // NO — ya existe `useState` importado arriba, no duplicar el import
```

(Nota para quien implemente: `useState` ya está importado en la primera línea del archivo — no agregar un segundo import, solo usar el `useState` existente para el estado del formulario visible/oculto.)

Agregar:

```ts
import { useDocumentRequests } from '@/features/documents/use-document-requests';
import { RequestDocumentForm } from '@/features/documents/components/request-document-form';
```

Dentro del componente, agregar el estado y el hook (junto a `const [activeSection, ...]`):

```ts
  const [showRequestForm, setShowRequestForm] = useState(false);
  const { data: documentRequests } = useDocumentRequests();
  const myRequests = (documentRequests ?? []).filter((r) => r.enrollmentId === enrollment.id);
```

Reemplazar el bloque `{activeSection === 'documentos' && (...)}` completo por:

```tsx
      {activeSection === 'documentos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Documentos emitidos</p>
            <Button variant="secondary" onClick={() => setShowRequestForm((v) => !v)}>
              {showRequestForm ? 'Cancelar' : 'Solicitar documento'}
            </Button>
          </div>

          {showRequestForm && <RequestDocumentForm enrollmentId={enrollment.id} />}

          {myRequests.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase text-muted-foreground">Mis solicitudes</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {myRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span>{DOCUMENT_TYPE_LABELS[r.type] ?? r.type}</span>
                    <span>
                      {r.status === 'pendiente_pago' && 'Pendiente de pago'}
                      {r.status === 'lista_para_imprimir' && 'Lista para retirar en secretaría'}
                      {r.status === 'lista' && 'Lista para descargar'}
                      {r.status === 'entregada' && 'Entregada'}
                      {r.status === 'rechazada' && `Rechazada${r.rejectionReason ? `: ${r.rejectionReason}` : ''}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin documentos emitidos.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {documents.map((doc) => (
                <li key={doc.id}>
                  {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} — {doc.issuedAt}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: sin errores. Corregir el `useState` duplicado si el paso 4 se copió literal (usar solo el `useState` ya importado en la línea 3 del archivo original).

- [ ] **Step 6: Verificación en vivo**

Loguearse como un `padre_tutor` de test (ver credenciales de test ya usadas en sesiones anteriores), ir al portal de familia, pestaña "Documentos", click en "Solicitar documento", pedir un tipo sin costo con entrega digital, confirmar que aparece en "Mis solicitudes" como "Lista para descargar" y que el documento aparece en la lista de emitidos.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/api/documents apps/web/src/features/documents apps/web/src/features/portal/components/child-summary-card.tsx
git commit -m "feat(documents): solicitar documento desde el portal de familia"
```

---

## Task 11: Frontend — cola de administración + precios

**Files:**
- Create: `apps/web/src/app/api/documents/types/prices/[type]/route.ts`
- Create: `apps/web/src/app/api/documents/requests/[id]/reject/route.ts`
- Create: `apps/web/src/app/api/documents/requests/[id]/deliver/route.ts`
- Create: `apps/web/src/features/documents/components/document-requests-queue.tsx`
- Create: `apps/web/src/features/documents/components/document-type-prices-form.tsx`
- Modify: `apps/web/src/app/(dashboard)/documents/page.tsx`

**Interfaces:**
- Consumes: `useDocumentRequests`, `useRejectDocumentRequest`, `useDeliverDocumentRequest`, `useDocumentTypePrices` (Task 10).
- Produces: pestañas "Documentos" / "Solicitudes" / "Precios" en `/documents`, visibles según `canManage`.

- [ ] **Step 1: BFF routes restantes**

```ts
// apps/web/src/app/api/documents/types/prices/[type]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { DocumentTypePrice } from '@eduapp/shared-types';

export async function PUT(req: NextRequest, { params }: { params: { type: string } }) {
  const body = await req.json();
  const price = await serverApiFetch<DocumentTypePrice>(`/documents/types/prices/${params.type}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (price === null) return NextResponse.json({ message: 'No se pudo actualizar el precio' }, { status: 400 });
  return NextResponse.json(price);
}
```

```ts
// apps/web/src/app/api/documents/requests/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { DocumentRequest } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const request = await serverApiFetch<DocumentRequest>(`/documents/requests/${params.id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (request === null) return NextResponse.json({ message: 'No se pudo rechazar' }, { status: 400 });
  return NextResponse.json(request);
}
```

```ts
// apps/web/src/app/api/documents/requests/[id]/deliver/route.ts
import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { DocumentRequest } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const request = await serverApiFetch<DocumentRequest>(`/documents/requests/${params.id}/deliver`, {
    method: 'PATCH',
  });
  if (request === null) return NextResponse.json({ message: 'No se pudo marcar como entregada' }, { status: 400 });
  return NextResponse.json(request);
}
```

- [ ] **Step 2: Agregar `useSetDocumentTypePrice` al hook existente**

En `apps/web/src/features/documents/use-document-requests.ts`, agregar al final:

```ts
async function setDocumentTypePrice({ type, amount }: { type: DocumentType; amount: number }): Promise<DocumentTypePrice> {
  const res = await fetch(`/api/documents/types/prices/${type}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error('No se pudo actualizar el precio');
  return res.json();
}

export function useSetDocumentTypePrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setDocumentTypePrice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-type-prices'] });
      toast.success('Precio actualizado.');
    },
  });
}
```

- [ ] **Step 3: Cola de solicitudes**

```tsx
// apps/web/src/features/documents/components/document-requests-queue.tsx
'use client';

import { useState } from 'react';
import type { DocumentRequestStatus, DocumentType } from '@eduapp/shared-types';
import { useDocumentRequests, useRejectDocumentRequest, useDeliverDocumentRequest } from '../use-document-requests';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  constancia_matricula: 'Constancia de matrícula',
  certificado_notas: 'Certificado de notas',
  constancia_buena_conducta: 'Constancia de buena conducta',
  otro: 'Otro',
};

const STATUS_LABELS: Record<DocumentRequestStatus, string> = {
  pendiente_pago: 'Pendiente de pago',
  lista_para_imprimir: 'Lista para imprimir',
  lista: 'Lista (digital)',
  entregada: 'Entregada',
  rechazada: 'Rechazada',
};

export function DocumentRequestsQueue() {
  const [statusFilter, setStatusFilter] = useState<DocumentRequestStatus | undefined>('lista_para_imprimir');
  const { data: requests, isLoading } = useDocumentRequests(statusFilter);
  const reject = useRejectDocumentRequest();
  const deliver = useDeliverDocumentRequest();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([undefined, 'pendiente_pago', 'lista_para_imprimir', 'lista', 'entregada', 'rechazada'] as const).map(
          (status) => (
            <button
              key={status ?? 'todas'}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded px-3 py-1.5 text-sm ${
                statusFilter === status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {status ? STATUS_LABELS[status] : 'Todas'}
            </button>
          ),
        )}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !requests || requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay solicitudes en este estado.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="rounded border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {DOCUMENT_TYPE_LABELS[r.type] ?? r.type} — {r.deliveryMethod === 'fisico' ? 'Físico' : 'Digital'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {STATUS_LABELS[r.status]} · {new Date(r.requestedAt).toLocaleDateString('es-CO')}
                    {r.note ? ` · "${r.note}"` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.status === 'lista_para_imprimir' && (
                    <Button disabled={deliver.isPending} onClick={() => deliver.mutate(r.id)}>
                      Marcar entregado
                    </Button>
                  )}
                  {r.status === 'pendiente_pago' && (
                    <Button variant="secondary" onClick={() => setRejectingId(r.id)}>
                      Rechazar
                    </Button>
                  )}
                </div>
              </div>
              {rejectingId === r.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    placeholder="Motivo del rechazo"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="flex h-9 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <Button
                    disabled={!reason || reject.isPending}
                    onClick={() =>
                      reject.mutate(
                        { id: r.id, reason },
                        { onSuccess: () => { setRejectingId(null); setReason(''); } },
                      )
                    }
                  >
                    Confirmar
                  </Button>
                  <Button variant="ghost" onClick={() => setRejectingId(null)}>
                    Volver
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Formulario de precios**

```tsx
// apps/web/src/features/documents/components/document-type-prices-form.tsx
'use client';

import { useState, useEffect } from 'react';
import type { DocumentType } from '@eduapp/shared-types';
import { useDocumentTypePrices, useSetDocumentTypePrice } from '../use-document-requests';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';

const TYPES: { value: DocumentType; label: string }[] = [
  { value: 'constancia_matricula', label: 'Constancia de matrícula' },
  { value: 'certificado_notas', label: 'Certificado de notas' },
  { value: 'constancia_buena_conducta', label: 'Constancia de buena conducta' },
  { value: 'otro', label: 'Otro' },
];

export function DocumentTypePricesForm() {
  const { data: prices, isLoading } = useDocumentTypePrices();
  const setPrice = useSetDocumentTypePrice();
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!prices) return;
    setAmounts(Object.fromEntries(prices.map((p) => [p.type, String(p.amount)])));
  }, [prices]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-3">
      {TYPES.map((t) => (
        <div key={t.value} className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`price-${t.value}`}>{t.label}</Label>
            <input
              id={`price-${t.value}`}
              type="number"
              min={0}
              value={amounts[t.value] ?? '0'}
              onChange={(e) => setAmounts((prev) => ({ ...prev, [t.value]: e.target.value }))}
              className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <Button
            variant="secondary"
            disabled={setPrice.isPending}
            onClick={() => setPrice.mutate({ type: t.value, amount: Number(amounts[t.value] ?? 0) })}
          >
            Guardar
          </Button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Pestañas en `/documents`**

Reemplazar `apps/web/src/app/(dashboard)/documents/page.tsx` completo por:

```tsx
'use client';

import { useState } from 'react';
import { IssueDocumentForm } from '@/features/documents/components/issue-document-form';
import { DocumentsList } from '@/features/documents/components/documents-list';
import { DocumentRequestsQueue } from '@/features/documents/components/document-requests-queue';
import { DocumentTypePricesForm } from '@/features/documents/components/document-type-prices-form';
import { useMyProfile } from '@/features/profile/use-profile';
import { canManageDocuments } from '@/lib/permissions';
import { cn } from '@/lib/utils';

export default function DocumentsPage() {
  const { data: user } = useMyProfile();
  const canManage = canManageDocuments(user?.roles ?? []);
  const [tab, setTab] = useState<'documentos' | 'solicitudes' | 'precios'>('documentos');

  const tabs = canManage
    ? ([
        { key: 'documentos' as const, label: 'Documentos' },
        { key: 'solicitudes' as const, label: 'Solicitudes' },
        { key: 'precios' as const, label: 'Precios' },
      ])
    : ([{ key: 'documentos' as const, label: 'Documentos' }]);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Constancias y certificados emitidos por estudiante.
        </p>
      </div>

      {canManage && (
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-2 text-sm transition-colors',
                tab === t.key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'documentos' && (
        <>
          {canManage && <IssueDocumentForm />}
          <DocumentsList canManage={canManage} />
        </>
      )}
      {tab === 'solicitudes' && canManage && <DocumentRequestsQueue />}
      {tab === 'precios' && canManage && <DocumentTypePricesForm />}
    </main>
  );
}
```

**Nota:** la página original era un Server Component (`async function DocumentsPage()` con `getCurrentUser()`); acá pasa a Client Component para poder usar `useState` en las pestañas. `useMyProfile()` ya existe en `apps/web/src/features/profile/use-profile.ts` (`useQuery` sobre `GET /api/auth/me`, devuelve `AuthenticatedUser | null` con `roles: string[]`) — se reutiliza tal cual, sin crear ningún hook nuevo.

- [ ] **Step 6: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Verificación en vivo**

Loguearse como `secretaria`/`admin_institucion`, ir a `/documents`, confirmar las 3 pestañas, configurar un precio > 0 para "Certificado de notas" en la pestaña Precios, luego (como padre_tutor/estudiante) solicitar ese tipo y confirmar que redirige al checkout de Wompi. Volver como secretaria a la pestaña Solicitudes y confirmar que aparece en "Pendiente de pago".

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/api/documents apps/web/src/features/documents "apps/web/src/app/(dashboard)/documents/page.tsx"
git commit -m "feat(documents): cola de solicitudes y precios por tipo en el panel de administración"
```

---

## Task 12: Frontend — widget del panel para admin/secretaria

**Files:**
- Create: `apps/web/src/features/dashboard/components/document-requests-widget.tsx`
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useDocumentRequests('lista_para_imprimir')`.

- [ ] **Step 1: Widget**

```tsx
// apps/web/src/features/dashboard/components/document-requests-widget.tsx
'use client';

import Link from 'next/link';
import { useDocumentRequests } from '@/features/documents/use-document-requests';
import { Card } from '@/components/ui/card';

export function DocumentRequestsWidget() {
  const { data: requests, isLoading } = useDocumentRequests('lista_para_imprimir');
  const count = requests?.length ?? 0;

  return (
    <Link href="/documents?tab=solicitudes" className="block">
      <Card className={count > 0 ? 'border-warning/40' : undefined}>
        <p className="text-[10px] uppercase tracking-wide text-primary">Solicitudes de documentos</p>
        <p className="mt-1 text-2xl font-medium">{isLoading ? '…' : count}</p>
        <p className="text-xs text-muted-foreground">para imprimir y entregar</p>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Wiring en el panel**

En `apps/web/src/app/(dashboard)/dashboard/page.tsx`, agregar el import:

```ts
import { DocumentRequestsWidget } from '@/features/dashboard/components/document-requests-widget';
```

Y agregar `{isAdmin && <DocumentRequestsWidget />}` dentro del mismo `<div className="grid grid-cols-2 gap-4 md:grid-cols-4">` que ya tiene `{isAdmin && <QuickStatsWidget />}` — justo después de esa línea. No condicionar por `isSecretaria` con un `||` nuevo: revisar primero si conviene agregar `isSecretaria` a la condición (secretaría es quien de verdad opera esta cola día a día) — usar `{(isAdmin || isSecretaria) && <DocumentRequestsWidget />}`.

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificación en vivo**

Loguearse como `secretaria`, confirmar que el widget aparece en el Panel con el conteo correcto de solicitudes `lista_para_imprimir`, y que el click lleva a `/documents` con la pestaña de solicitudes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/components/document-requests-widget.tsx "apps/web/src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(documents): widget de solicitudes pendientes en el panel de administración"
```

---

## Task 13: Integración final — boot real, test suite completo, verificación end-to-end en vivo

**Files:** ninguno nuevo — solo verificación.

- [ ] **Step 1: Test suite completo del backend**

Run: `cd apps/api && npx jest`
Expected: todos los tests pasan (los nuevos de las Tasks 1-7 más los ~490 existentes sin romper ninguno).

- [ ] **Step 2: Typecheck completo**

Run: `cd apps/api && npx tsc --noEmit && cd ../web && npx tsc --noEmit && cd ../../packages/shared-types && npx tsc --noEmit`
Expected: sin errores en ninguno de los tres.

- [ ] **Step 3: Boot real de la API completa (no solo application context)**

Con Postgres/Redis corriendo y las migraciones aplicadas (`npm run migration:run:tenant:all` si no se corrió ya en las Tasks 2/3):

Run: `cd apps/api && npm run dev`
Expected en el log: `Nest application successfully started` sin ningún error de "cannot create the X instance" / circular dependency. Dejarlo corriendo para el resto de esta tarea.

- [ ] **Step 4: Flujo completo en vivo — documento gratis, entrega digital**

1. Como `secretaria`, en `/documents` → pestaña Precios, dejar "Constancia de matrícula" en 0.
2. Como `padre_tutor` (o `estudiante`) de test, portal → pestaña Documentos → Solicitar documento → tipo "Constancia de matrícula", entrega "PDF digital" → Solicitar.
3. Confirmar que la solicitud aparece de inmediato como "Lista para descargar" y el documento aparece en la lista de emitidos con PDF descargable.
4. Confirmar que NO se generó ninguna notificación para secretaría (la campana no suma no leídas).

- [ ] **Step 5: Flujo completo en vivo — documento con costo, entrega física**

1. Como `secretaria`, poner un precio > 0 a "Certificado de notas".
2. Como `padre_tutor`/`estudiante`, solicitar ese tipo con entrega "Impreso" → confirmar que redirige al checkout de Wompi (sandbox).
3. Completar el pago de prueba en el sandbox de Wompi (o, si el ambiente de dev no tiene sandbox configurado, disparar el webhook manualmente con `curl` simulando `event: 'transaction.updated'` contra `POST /finance/payments/webhook`, mirando cómo lo hacen los tests de `handle-payment-webhook` existentes para armar el payload).
4. Confirmar que la solicitud pasa a "Lista para imprimir".
5. Confirmar que la campana de notificaciones de un usuario `secretaria` (y de un `admin_institucion`) ahora muestra 1 no leída, con el título "Documento listo para imprimir", y que el widget del panel también sube su conteo.
6. Como `secretaria`, en `/documents` → Solicitudes → filtro "Lista para imprimir" → click "Marcar entregado" → confirmar que pasa a "Entregada" y desaparece del filtro y del widget.

- [ ] **Step 6: Flujo de rechazo**

1. Solicitar un documento con costo (sin pagar).
2. Como `secretaria`, en la cola con filtro "Pendiente de pago" → Rechazar → escribir un motivo → Confirmar.
3. Confirmar que la solicitud pasa a "Rechazada" y que el estudiante/acudiente ve el motivo en "Mis solicitudes".

- [ ] **Step 7: Cerrar el servidor de dev**

Detener el proceso de `npm run dev` levantado en el Step 3.

- [ ] **Step 8: Commit final (si algo quedó sin commitear de los ajustes hechos durante la verificación)**

```bash
git status --porcelain
```

Si hay cambios (por ejemplo correcciones encontradas durante la verificación en vivo), revisar con `git diff`, y commitear con un mensaje que describa el fix puntual — no agrupar bajo un commit genérico de "fixes varios".
