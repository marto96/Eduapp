# Solicitudes de Admisión Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Digitalizar el embudo de admisión (solicitud pública → pago en línea → entrevista manual → aceptar/rechazar → enlace con matrícula), incluyendo el caso de un estudiante que regresa al colegio.

**Architecture:** Módulo nuevo `admissions` (domain/application/infrastructure/interface, mismo patrón que el resto de la API). Endpoints públicos (`@Public()`) para crear la solicitud y consultar estado; endpoints autenticados (CASL, subject `'Admission'`) para que secretaría/dirección gestione. El pago reutiliza `PaymentGatewayPort` (MercadoPago) de `finance` sin tocar sus entidades internas — el módulo tiene su propio `AdmissionPaymentAttempt` y su propio webhook. El precio (varía por grado) se lee de `FeeSchedule` agregando un concepto nuevo `'solicitud_admision'`. Al aceptar, NO se crea automáticamente el usuario/matrícula — se devuelve la data para pre-cargar el flujo de Matrícula existente (que ya tiene la validación de no-retroceso de grado), y un endpoint de "enlazar matrícula" cierra el círculo cuando esa matrícula se confirma.

**Tech Stack:** NestJS (TypeORM, class-validator, `@nestjs/throttler`), Next.js App Router (React Query, fetch-based BFF routes), Postgres (schema por tenant).

**Spec:** `docs/superpowers/specs/2026-09-01-admissions-design.md`

## Refinamientos sobre el spec original

Dos campos que el spec no listaba explícitamente en la tabla de
`AdmissionApplication`, necesarios para que el resto del diseño cierre sin
ambigüedad — se documentan acá para que quien lea el spec y el plan juntos
no vea una discrepancia:

- **`academicYearId`**: el precio (`FeeSchedule`) se busca por
  `gradeId + academicYearId + concept`, así que hace falta saber a qué año
  lectivo aplica la solicitud. Se resuelve automáticamente al crear la
  solicitud (el año lectivo con `status: 'active'` — la familia no lo
  elige), se persiste, y se reutiliza tal cual al pre-cargar el flujo de
  matrícula (no se vuelve a preguntar).
- **`studentAddress`**: el modal de "Estudiante nuevo" en Matrícula ya
  exige dirección como campo obligatorio; sin este campo en la solicitud,
  el pre-llenado quedaría incompleto. Se agrega al formulario público.

Los únicos datos de "Estudiante nuevo" que **no** vienen pre-cargados son
`email` y `password` — se definen recién al confirmar la matrícula
(no tiene sentido que un formulario público anónimo fije la contraseña de
una cuenta).

## Global Constraints

- Endpoints públicos usan `@Public()` (no `@CheckPolicies`) — el control de acceso ahí es el `trackingCode`/la firma del webhook, no un rol.
- `POST /admissions/applications` limitado a 5 req/min por IP; `GET /admissions/applications/status/:trackingCode` a 10 req/min por IP (`@Throttle`, más estricto que el global de 20/min).
- `GET /admissions/applications/status/:trackingCode` devuelve únicamente `status`, `gradeName`, `createdAt` — nunca datos personales del aspirante.
- El webhook de pago verifica la firma con `verifyMercadoPagoSignature` (importada de `finance`, no duplicada) antes de procesar cualquier notificación.
- Ningún nuevo `Charge` se genera por la cuota de admisión — `FeeSchedule` se usa solo como tabla de precios.
- Todas las transiciones de estado son de un solo sentido (ver máquina de estados del spec); ninguna vuelve hacia atrás.
- DTOs con `class-validator` en todos los campos — se apoya en `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` ya configurado globalmente en `apps/api/src/main.ts`.

---

## Task 1: Concepto `solicitud_admision` en `ChargeConcept`

**Files:**
- Modify: `apps/api/src/modules/finance/domain/entities/charge.entity.ts:1`
- Modify: `apps/api/src/modules/finance/interface/dtos/create-fee-schedule.dto.ts:4`
- Modify: `packages/shared-types/src/index.ts` (línea con `export type ChargeConcept`)
- Modify: `apps/web/src/features/finance/components/fee-schedules-panel.tsx:14-18`

**Interfaces:**
- Produces: `ChargeConcept` ahora incluye `'solicitud_admision'` (backend y frontend) — usado en Task 4 al buscar el precio vía `FeeScheduleRepositoryPort.findOne(gradeId, academicYearId, 'solicitud_admision')`.

No hay lógica nueva que testear con un test unitario dedicado — la cobertura existente de `create-fee-schedule.use-case.spec.ts` ya prueba el flujo genérico de creación de precios; este task solo amplía qué valores acepta.

- [ ] **Step 1: Agregar el nuevo concepto al tipo compartido**

En `apps/api/src/modules/finance/domain/entities/charge.entity.ts:1`, cambiar:

```ts
export type ChargeConcept = 'matricula' | 'pension' | 'otro';
```

por:

```ts
export type ChargeConcept = 'matricula' | 'pension' | 'solicitud_admision' | 'otro';
```

- [ ] **Step 2: Permitir el concepto nuevo al crear un `FeeSchedule`**

En `apps/api/src/modules/finance/interface/dtos/create-fee-schedule.dto.ts:4`, cambiar:

```ts
const KNOWN_CONCEPTS: ChargeConcept[] = ['matricula', 'pension', 'otro'];
```

por:

```ts
const KNOWN_CONCEPTS: ChargeConcept[] = ['matricula', 'pension', 'solicitud_admision', 'otro'];
```

**No** tocar `apps/api/src/modules/finance/interface/dtos/create-charge.dto.ts` ni
`list-charges-query.dto.ts` — la cuota de admisión nunca debe poder cargarse como un `Charge` real (ver Global Constraints).

- [ ] **Step 3: Reflejar el tipo en `shared-types`**

En `packages/shared-types/src/index.ts`, buscar la línea:

```ts
export type ChargeConcept = 'matricula' | 'pension' | 'otro';
```

y reemplazarla por:

```ts
export type ChargeConcept = 'matricula' | 'pension' | 'solicitud_admision' | 'otro';
```

- [ ] **Step 4: Agregar la opción en el panel de precios (frontend)**

En `apps/web/src/features/finance/components/fee-schedules-panel.tsx:14-18`, cambiar:

```ts
const CONCEPTS: { value: ChargeConcept; label: string }[] = [
  { value: 'matricula', label: 'Matrícula' },
  { value: 'pension', label: 'Pensión' },
  { value: 'otro', label: 'Otro' },
];
```

por:

```ts
const CONCEPTS: { value: ChargeConcept; label: string }[] = [
  { value: 'matricula', label: 'Matrícula' },
  { value: 'pension', label: 'Pensión' },
  { value: 'solicitud_admision', label: 'Solicitud de admisión' },
  { value: 'otro', label: 'Otro' },
];
```

- [ ] **Step 5: Verificar que nada se rompió**

Run: `cd apps/api && npx jest src/modules/finance 2>&1 | tail -30`
Expected: todos los tests de `finance` en verde (mismo número que antes).

Run: `cd apps/web && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/finance/domain/entities/charge.entity.ts \
        apps/api/src/modules/finance/interface/dtos/create-fee-schedule.dto.ts \
        packages/shared-types/src/index.ts \
        apps/web/src/features/finance/components/fee-schedules-panel.tsx
git commit -m "feat(finance): agrega concepto solicitud_admision para precios de admisión"
```

---

## Task 2: Entidades de dominio `AdmissionApplication` y `AdmissionPaymentAttempt`

**Files:**
- Create: `apps/api/src/modules/admissions/domain/entities/admission-application.entity.ts`
- Create: `apps/api/src/modules/admissions/domain/entities/admission-application.entity.spec.ts`
- Create: `apps/api/src/modules/admissions/domain/entities/admission-payment-attempt.entity.ts`
- Create: `apps/api/src/modules/admissions/domain/entities/admission-payment-attempt.entity.spec.ts`
- Create: `apps/api/src/modules/admissions/application/services/generate-tracking-code.ts`
- Create: `apps/api/src/modules/admissions/application/services/generate-tracking-code.spec.ts`

**Interfaces:**
- Consumes: `DocumentType` de `apps/api/src/modules/identity/domain/entities/user.entity.ts` (ya existe: `'RC' | 'TI' | 'CC' | 'CE' | 'PA'`).
- Produces: `AdmissionStatus`, clase `AdmissionApplication` (con métodos `markPaid()`, `recordInterview()`, `accept()`, `reject()`, `linkEnrollment()`), clase `AdmissionPaymentAttempt` (con `approve()`/`reject()`), función `generateTrackingCode(): string`. Todo esto lo usan las tareas siguientes.

- [ ] **Step 1: Escribir el test de `generateTrackingCode`**

```ts
// apps/api/src/modules/admissions/application/services/generate-tracking-code.spec.ts
import { generateTrackingCode } from './generate-tracking-code';

describe('generateTrackingCode', () => {
  it('genera un código con el prefijo SOL- y 6 caracteres', () => {
    const code = generateTrackingCode();
    expect(code).toMatch(/^SOL-[A-Z2-9]{6}$/);
  });

  it('no repite el mismo código en 1000 generaciones seguidas', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateTrackingCode()));
    expect(codes.size).toBe(1000);
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `cd apps/api && npx jest src/modules/admissions/application/services/generate-tracking-code -v`
Expected: FAIL — "Cannot find module './generate-tracking-code'"

- [ ] **Step 3: Implementar `generateTrackingCode`**

```ts
// apps/api/src/modules/admissions/application/services/generate-tracking-code.ts
import { randomBytes } from 'node:crypto';

/**
 * Sin 0/O/1/I para que sea fácil de leer en voz alta o transcribir a mano.
 * 6 caracteres sobre un alfabeto de 32 ≈ mil millones de combinaciones —
 * junto con el rate limit del endpoint de creación, hace inviable una
 * fuerza bruta del código de otro aspirante.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export function generateTrackingCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `SOL-${chars.join('')}`;
}
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `cd apps/api && npx jest src/modules/admissions/application/services/generate-tracking-code -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Escribir el test de `AdmissionApplication`**

```ts
// apps/api/src/modules/admissions/domain/entities/admission-application.entity.spec.ts
import { AdmissionApplication } from './admission-application.entity';

describe('AdmissionApplication', () => {
  const build = () =>
    new AdmissionApplication(
      'app-1',
      'SOL-A8F3K2',
      'Juan',
      'Pérez',
      '2015-05-20',
      'TI',
      '1098765432',
      'Calle 1 # 2-3',
      'grade-1',
      'year-2026',
      'María Pérez',
      'maria@test.com',
      '3001234567',
      'pendiente_pago',
      150000,
      null,
      null,
      null,
      null,
      null,
      null,
      '2026-01-01T00:00:00.000Z',
    );

  it('markPaid() pasa a pendiente_entrevista y completa paidAt', () => {
    const app = build();
    app.markPaid();
    expect(app.status).toBe('pendiente_entrevista');
    expect(app.paidAt).not.toBeNull();
  });

  it('markPaid() es idempotente: no hace nada si ya no está pendiente_pago', () => {
    const app = build();
    app.markPaid();
    const firstPaidAt = app.paidAt;
    app.markPaid();
    expect(app.paidAt).toBe(firstPaidAt);
  });

  it('recordInterview() carga fecha y notas', () => {
    const app = build();
    app.recordInterview('2026-02-01T10:00:00.000Z', 'Buena entrevista');
    expect(app.interviewDate).toBe('2026-02-01T10:00:00.000Z');
    expect(app.interviewNotes).toBe('Buena entrevista');
  });

  it('accept() pasa a aceptada y guarda el matchedUserId', () => {
    const app = build();
    app.accept('user-99');
    expect(app.status).toBe('aceptada');
    expect(app.matchedUserId).toBe('user-99');
  });

  it('accept() acepta matchedUserId null (aspirante nuevo)', () => {
    const app = build();
    app.accept(null);
    expect(app.matchedUserId).toBeNull();
  });

  it('reject() pasa a rechazada y guarda el motivo', () => {
    const app = build();
    app.reject('No cumple requisitos de edad');
    expect(app.status).toBe('rechazada');
    expect(app.rejectionReason).toBe('No cumple requisitos de edad');
  });

  it('linkEnrollment() completa resultingEnrollmentId', () => {
    const app = build();
    app.linkEnrollment('enrollment-1');
    expect(app.resultingEnrollmentId).toBe('enrollment-1');
  });
});
```

- [ ] **Step 6: Correr el test y ver que falla**

Run: `cd apps/api && npx jest src/modules/admissions/domain/entities/admission-application -v`
Expected: FAIL — "Cannot find module './admission-application.entity'"

- [ ] **Step 7: Implementar `AdmissionApplication`**

```ts
// apps/api/src/modules/admissions/domain/entities/admission-application.entity.ts
import { DocumentType } from '../../../identity/domain/entities/user.entity';

export type AdmissionStatus = 'pendiente_pago' | 'pendiente_entrevista' | 'aceptada' | 'rechazada';

export class AdmissionApplication {
  constructor(
    public readonly id: string,
    public readonly trackingCode: string,
    public readonly studentFirstName: string,
    public readonly studentLastName: string,
    public readonly studentBirthDate: string,
    public readonly studentDocumentType: DocumentType,
    public readonly studentDocumentNumber: string,
    public readonly studentAddress: string,
    public readonly gradeId: string,
    public readonly academicYearId: string,
    public readonly guardianName: string,
    public readonly guardianEmail: string,
    public readonly guardianPhone: string,
    public status: AdmissionStatus,
    public readonly feeAmount: number,
    public paidAt: string | null,
    public interviewDate: string | null,
    public interviewNotes: string | null,
    public rejectionReason: string | null,
    public matchedUserId: string | null,
    public resultingEnrollmentId: string | null,
    public readonly createdAt: string,
  ) {}

  /** El webhook puede reintentar notificaciones — no debe duplicar el efecto. */
  markPaid(): void {
    if (this.status !== 'pendiente_pago') return;
    this.status = 'pendiente_entrevista';
    this.paidAt = new Date().toISOString();
  }

  recordInterview(date: string, notes: string | null): void {
    this.interviewDate = date;
    this.interviewNotes = notes;
  }

  accept(matchedUserId: string | null): void {
    this.status = 'aceptada';
    this.matchedUserId = matchedUserId;
  }

  reject(reason: string): void {
    this.status = 'rechazada';
    this.rejectionReason = reason;
  }

  linkEnrollment(enrollmentId: string): void {
    this.resultingEnrollmentId = enrollmentId;
  }
}
```

- [ ] **Step 8: Correr el test y ver que pasa**

Run: `cd apps/api && npx jest src/modules/admissions/domain/entities/admission-application -v`
Expected: PASS (7 tests)

- [ ] **Step 9: Escribir el test de `AdmissionPaymentAttempt`**

```ts
// apps/api/src/modules/admissions/domain/entities/admission-payment-attempt.entity.spec.ts
import { AdmissionPaymentAttempt } from './admission-payment-attempt.entity';

describe('AdmissionPaymentAttempt', () => {
  const build = () =>
    new AdmissionPaymentAttempt('att-1', 'app-1', 'pref-1', 150000, 'pending', '2026-01-01T00:00:00.000Z');

  it('approve() cambia el status a approved', () => {
    const attempt = build();
    attempt.approve();
    expect(attempt.status).toBe('approved');
  });

  it('reject() cambia el status a rejected', () => {
    const attempt = build();
    attempt.reject();
    expect(attempt.status).toBe('rejected');
  });
});
```

- [ ] **Step 10: Correr el test y ver que falla**

Run: `cd apps/api && npx jest src/modules/admissions/domain/entities/admission-payment-attempt -v`
Expected: FAIL — "Cannot find module './admission-payment-attempt.entity'"

- [ ] **Step 11: Implementar `AdmissionPaymentAttempt`**

```ts
// apps/api/src/modules/admissions/domain/entities/admission-payment-attempt.entity.ts
export type AdmissionPaymentAttemptStatus = 'pending' | 'approved' | 'rejected';

/** Mismo rol que `PaymentAttempt` en `finance`, pero enlazado a una solicitud de admisión en vez de a un Charge. */
export class AdmissionPaymentAttempt {
  constructor(
    public readonly id: string,
    public readonly admissionApplicationId: string,
    public readonly gatewayPreferenceId: string,
    public readonly amount: number,
    public status: AdmissionPaymentAttemptStatus,
    public readonly createdAt: string,
  ) {}

  approve(): void {
    this.status = 'approved';
  }

  reject(): void {
    this.status = 'rejected';
  }
}
```

- [ ] **Step 12: Correr el test y ver que pasa**

Run: `cd apps/api && npx jest src/modules/admissions/domain/entities/admission-payment-attempt -v`
Expected: PASS (2 tests)

- [ ] **Step 13: Commit**

```bash
git add apps/api/src/modules/admissions
git commit -m "feat(admissions): agrega entidades de dominio y generador de tracking code"
```

---

## Task 3: Persistencia — puertos, entidades ORM, repositorios y migración

**Files:**
- Create: `apps/api/src/modules/admissions/application/ports/admission-application.repository.port.ts`
- Create: `apps/api/src/modules/admissions/application/ports/admission-payment-attempt.repository.port.ts`
- Create: `apps/api/src/modules/admissions/infrastructure/entities/admission-application.orm-entity.ts`
- Create: `apps/api/src/modules/admissions/infrastructure/entities/admission-payment-attempt.orm-entity.ts`
- Create: `apps/api/src/modules/admissions/infrastructure/repositories/typeorm-admission-application.repository.ts`
- Create: `apps/api/src/modules/admissions/infrastructure/repositories/typeorm-admission-payment-attempt.repository.ts`
- Create: `apps/api/src/core/database/migrations/tenant/1700000000051-CreateAdmissions.ts`
- Modify: `apps/api/src/core/database/tenant.datasource.ts:15-28` (agregar `'admissions'` a `TENANT_MODULES`)

**Interfaces:**
- Consumes: `AdmissionApplication`, `AdmissionStatus`, `AdmissionPaymentAttempt`, `AdmissionPaymentAttemptStatus` de Task 2. `DocumentType` de `identity`.
- Produces: `AdmissionApplicationRepositoryPort` con `findById`, `findByTrackingCode`, `findPendingByDocumentNumber`, `findAll(filter?: {status?})`, `save`. `AdmissionPaymentAttemptRepositoryPort` con `findById`, `save`. Las tareas 4-10 inyectan estos puertos.

No hay tests unitarios de repositorio en este codebase (ningún módulo los tiene — se verifica corriendo la migración real). El "test" de este task es que la migración corra sin errores contra la base de dev.

- [ ] **Step 1: Puerto de `AdmissionApplication`**

```ts
// apps/api/src/modules/admissions/application/ports/admission-application.repository.port.ts
import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';

export interface AdmissionApplicationFilter {
  status?: AdmissionStatus;
}

export abstract class AdmissionApplicationRepositoryPort {
  abstract findById(id: string): Promise<AdmissionApplication | null>;
  abstract findByTrackingCode(trackingCode: string): Promise<AdmissionApplication | null>;
  /** Busca una solicitud en pendiente_pago o pendiente_entrevista para ese documento — evita duplicados. */
  abstract findPendingByDocumentNumber(documentNumber: string): Promise<AdmissionApplication | null>;
  abstract findAll(filter?: AdmissionApplicationFilter): Promise<AdmissionApplication[]>;
  abstract save(application: AdmissionApplication): Promise<void>;
}
```

- [ ] **Step 2: Puerto de `AdmissionPaymentAttempt`**

```ts
// apps/api/src/modules/admissions/application/ports/admission-payment-attempt.repository.port.ts
import { AdmissionPaymentAttempt } from '../../domain/entities/admission-payment-attempt.entity';

export abstract class AdmissionPaymentAttemptRepositoryPort {
  abstract findById(id: string): Promise<AdmissionPaymentAttempt | null>;
  abstract save(attempt: AdmissionPaymentAttempt): Promise<void>;
}
```

- [ ] **Step 3: Entidad ORM de `AdmissionApplication`**

```ts
// apps/api/src/modules/admissions/infrastructure/entities/admission-application.orm-entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'admission_applications' })
export class AdmissionApplicationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tracking_code', unique: true })
  trackingCode: string;

  @Column({ name: 'student_first_name' })
  studentFirstName: string;

  @Column({ name: 'student_last_name' })
  studentLastName: string;

  @Column({ name: 'student_birth_date', type: 'date' })
  studentBirthDate: string;

  @Column({ name: 'student_document_type' })
  studentDocumentType: string;

  @Column({ name: 'student_document_number' })
  studentDocumentNumber: string;

  @Column({ name: 'student_address', type: 'text' })
  studentAddress: string;

  @Column({ name: 'grade_id' })
  gradeId: string;

  @Column({ name: 'academic_year_id' })
  academicYearId: string;

  @Column({ name: 'guardian_name' })
  guardianName: string;

  @Column({ name: 'guardian_email' })
  guardianEmail: string;

  @Column({ name: 'guardian_phone' })
  guardianPhone: string;

  @Column()
  status: string;

  @Column({ name: 'fee_amount', type: 'real' })
  feeAmount: number;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'interview_date', type: 'timestamptz', nullable: true })
  interviewDate: Date | null;

  @Column({ name: 'interview_notes', type: 'text', nullable: true })
  interviewNotes: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'matched_user_id', nullable: true })
  matchedUserId: string | null;

  @Column({ name: 'resulting_enrollment_id', nullable: true })
  resultingEnrollmentId: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
```

- [ ] **Step 4: Entidad ORM de `AdmissionPaymentAttempt`**

```ts
// apps/api/src/modules/admissions/infrastructure/entities/admission-payment-attempt.orm-entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'admission_payment_attempts' })
export class AdmissionPaymentAttemptOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admission_application_id' })
  admissionApplicationId: string;

  @Column({ name: 'gateway_preference_id' })
  gatewayPreferenceId: string;

  @Column({ type: 'real' })
  amount: number;

  @Column()
  status: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
```

- [ ] **Step 5: Repositorio de `AdmissionApplication`**

```ts
// apps/api/src/modules/admissions/infrastructure/repositories/typeorm-admission-application.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  AdmissionApplicationFilter,
  AdmissionApplicationRepositoryPort,
} from '../../application/ports/admission-application.repository.port';
import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';
import { DocumentType } from '../../../identity/domain/entities/user.entity';
import { AdmissionApplicationOrmEntity } from '../entities/admission-application.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

const PENDING_STATUSES: AdmissionStatus[] = ['pendiente_pago', 'pendiente_entrevista'];

@Injectable()
export class TypeOrmAdmissionApplicationRepository extends AdmissionApplicationRepositoryPort {
  private readonly repo: Repository<AdmissionApplicationOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AdmissionApplicationOrmEntity);
  }

  async findById(id: string): Promise<AdmissionApplication | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByTrackingCode(trackingCode: string): Promise<AdmissionApplication | null> {
    const row = await this.repo.findOne({ where: { trackingCode } });
    return row ? this.toDomain(row) : null;
  }

  async findPendingByDocumentNumber(documentNumber: string): Promise<AdmissionApplication | null> {
    const row = await this.repo
      .createQueryBuilder('a')
      .where('a.student_document_number = :documentNumber', { documentNumber })
      .andWhere('a.status IN (:...statuses)', { statuses: PENDING_STATUSES })
      .getOne();
    return row ? this.toDomain(row) : null;
  }

  async findAll(filter?: AdmissionApplicationFilter): Promise<AdmissionApplication[]> {
    const query = this.repo.createQueryBuilder('a').orderBy('a.created_at', 'DESC');
    if (filter?.status) {
      query.andWhere('a.status = :status', { status: filter.status });
    }
    const rows = await query.getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async save(application: AdmissionApplication): Promise<void> {
    await this.repo.save({
      id: application.id,
      trackingCode: application.trackingCode,
      studentFirstName: application.studentFirstName,
      studentLastName: application.studentLastName,
      studentBirthDate: application.studentBirthDate,
      studentDocumentType: application.studentDocumentType,
      studentDocumentNumber: application.studentDocumentNumber,
      studentAddress: application.studentAddress,
      gradeId: application.gradeId,
      academicYearId: application.academicYearId,
      guardianName: application.guardianName,
      guardianEmail: application.guardianEmail,
      guardianPhone: application.guardianPhone,
      status: application.status,
      feeAmount: application.feeAmount,
      paidAt: application.paidAt ? new Date(application.paidAt) : null,
      interviewDate: application.interviewDate ? new Date(application.interviewDate) : null,
      interviewNotes: application.interviewNotes,
      rejectionReason: application.rejectionReason,
      matchedUserId: application.matchedUserId,
      resultingEnrollmentId: application.resultingEnrollmentId,
    });
  }

  private toDomain(row: AdmissionApplicationOrmEntity): AdmissionApplication {
    return new AdmissionApplication(
      row.id,
      row.trackingCode,
      row.studentFirstName,
      row.studentLastName,
      row.studentBirthDate,
      row.studentDocumentType as DocumentType,
      row.studentDocumentNumber,
      row.studentAddress,
      row.gradeId,
      row.academicYearId,
      row.guardianName,
      row.guardianEmail,
      row.guardianPhone,
      row.status as AdmissionStatus,
      row.feeAmount,
      row.paidAt ? row.paidAt.toISOString() : null,
      row.interviewDate ? row.interviewDate.toISOString() : null,
      row.interviewNotes,
      row.rejectionReason,
      row.matchedUserId,
      row.resultingEnrollmentId,
      row.createdAt.toISOString(),
    );
  }
}
```

- [ ] **Step 6: Repositorio de `AdmissionPaymentAttempt`**

```ts
// apps/api/src/modules/admissions/infrastructure/repositories/typeorm-admission-payment-attempt.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AdmissionPaymentAttemptRepositoryPort } from '../../application/ports/admission-payment-attempt.repository.port';
import {
  AdmissionPaymentAttempt,
  AdmissionPaymentAttemptStatus,
} from '../../domain/entities/admission-payment-attempt.entity';
import { AdmissionPaymentAttemptOrmEntity } from '../entities/admission-payment-attempt.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmAdmissionPaymentAttemptRepository extends AdmissionPaymentAttemptRepositoryPort {
  private readonly repo: Repository<AdmissionPaymentAttemptOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AdmissionPaymentAttemptOrmEntity);
  }

  async findById(id: string): Promise<AdmissionPaymentAttempt | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row
      ? new AdmissionPaymentAttempt(
          row.id,
          row.admissionApplicationId,
          row.gatewayPreferenceId,
          row.amount,
          row.status as AdmissionPaymentAttemptStatus,
          row.createdAt.toISOString(),
        )
      : null;
  }

  async save(attempt: AdmissionPaymentAttempt): Promise<void> {
    await this.repo.save({
      id: attempt.id,
      admissionApplicationId: attempt.admissionApplicationId,
      gatewayPreferenceId: attempt.gatewayPreferenceId,
      amount: attempt.amount,
      status: attempt.status,
    });
  }
}
```

- [ ] **Step 7: Migración**

```ts
// apps/api/src/core/database/migrations/tenant/1700000000051-CreateAdmissions.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdmissions1700000000051 implements MigrationInterface {
  name = 'CreateAdmissions1700000000051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admission_applications" (
        "id" uuid PRIMARY KEY,
        "tracking_code" varchar NOT NULL,
        "student_first_name" varchar NOT NULL,
        "student_last_name" varchar NOT NULL,
        "student_birth_date" date NOT NULL,
        "student_document_type" varchar NOT NULL,
        "student_document_number" varchar NOT NULL,
        "student_address" text NOT NULL,
        "grade_id" uuid NOT NULL REFERENCES "grades"("id"),
        "academic_year_id" uuid NOT NULL REFERENCES "academic_years"("id"),
        "guardian_name" varchar NOT NULL,
        "guardian_email" varchar NOT NULL,
        "guardian_phone" varchar NOT NULL,
        "status" varchar NOT NULL,
        "fee_amount" real NOT NULL,
        "paid_at" timestamptz,
        "interview_date" timestamptz,
        "interview_notes" text,
        "rejection_reason" text,
        "matched_user_id" uuid REFERENCES "users"("id"),
        "resulting_enrollment_id" uuid REFERENCES "enrollments"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_admission_applications_tracking_code"
      ON "admission_applications" ("tracking_code")
    `);

    await queryRunner.query(`
      CREATE TABLE "admission_payment_attempts" (
        "id" uuid PRIMARY KEY,
        "admission_application_id" uuid NOT NULL REFERENCES "admission_applications"("id") ON DELETE CASCADE,
        "gateway_preference_id" varchar NOT NULL,
        "amount" real NOT NULL,
        "status" varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admission_payment_attempts"`);
    await queryRunner.query(`DROP TABLE "admission_applications"`);
  }
}
```

- [ ] **Step 8: Registrar el módulo en el datasource de tenant**

En `apps/api/src/core/database/tenant.datasource.ts:15-28`, agregar `'admissions'` a `TENANT_MODULES` (después de `'enrollment'`, antes de `'attendance'`, o al final — el orden de esta lista no importa funcionalmente, solo agrupa entidades):

```ts
const TENANT_MODULES = [
  'identity',
  'academic',
  'enrollment',
  'admissions',
  'attendance',
  'grading',
  'schedule',
  'finance',
  'hr',
  'documents',
  'communication',
  'survey',
  'library',
];
```

- [ ] **Step 9: Correr la migración contra la base de dev y verificar**

Run: `cd apps/api && pnpm migration:run:tenant:all`
Expected: salida termina con `Listo: public + 1 tenant(s).`, sin errores. Confirmar con:

Run: `docker exec eduapp-postgres-1 psql -U eduapp -d eduapp -c "\dt tenant_colegio_demo.admission*"`
Expected: lista `admission_applications` y `admission_payment_attempts`.

- [ ] **Step 10: Verificar que el build compila**

Run: `cd apps/api && pnpm build`
Expected: sin errores (los repositorios/puertos compilan aunque todavía no los use ningún módulo registrado — no hace falta un `AdmissionsModule` todavía para que TypeScript los tipeche).

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/modules/admissions apps/api/src/core/database
git commit -m "feat(admissions): agrega persistencia (puertos, entidades ORM, repositorios, migración)"
```

---

## Task 4: `CreateAdmissionApplicationUseCase`

**Files:**
- Create: `apps/api/src/modules/admissions/application/use-cases/create-admission-application.use-case.ts`
- Create: `apps/api/src/modules/admissions/application/use-cases/create-admission-application.use-case.spec.ts`
- Create: `apps/api/src/modules/admissions/interface/dtos/create-admission-application.dto.ts`

**Interfaces:**
- Consumes: `AdmissionApplicationRepositoryPort`, `AdmissionPaymentAttemptRepositoryPort` (Task 3); `AdmissionApplication`, `AdmissionPaymentAttempt` (Task 2); `generateTrackingCode` (Task 2); `GradeRepositoryPort` (`apps/api/src/modules/academic/application/ports/grade.repository.port.ts`, ya existe: `findById(id): Promise<Grade|null>`); `AcademicYearRepositoryPort` (`apps/api/src/modules/academic/application/ports/academic-year.repository.port.ts`, ya existe: `findAll(): Promise<AcademicYear[]>`, cada `AcademicYear` tiene `status: 'active'|'closed'`); `FeeScheduleRepositoryPort` (`apps/api/src/modules/finance/application/ports/fee-schedule.repository.port.ts`, ya existe: `findOne(gradeId, academicYearId, concept): Promise<FeeSchedule|null>`, `FeeSchedule.amount: number`); `PaymentGatewayPort` (`apps/api/src/modules/finance/application/ports/payment-gateway.port.ts`, ya existe: `createCheckoutPreference({externalReference, payerEmail, item: {title, amount}}): Promise<{preferenceId, checkoutUrl}>`); `DocumentType` de `identity`.
- Produces: `CreateAdmissionApplicationInput`, `CreateAdmissionApplicationOutput` (`{trackingCode, checkoutUrl}`), clase `CreateAdmissionApplicationUseCase`. Lo usa el controlador público de Task 7.

- [ ] **Step 1: Escribir el test**

```ts
// apps/api/src/modules/admissions/application/use-cases/create-admission-application.use-case.spec.ts
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CreateAdmissionApplicationUseCase } from './create-admission-application.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from '../ports/admission-payment-attempt.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { FeeScheduleRepositoryPort } from '../../../finance/application/ports/fee-schedule.repository.port';
import { PaymentGatewayPort } from '../../../finance/application/ports/payment-gateway.port';
import { Grade } from '../../../academic/domain/entities/grade.entity';
import { AcademicYear } from '../../../academic/domain/entities/academic-year.entity';
import { FeeSchedule } from '../../../finance/domain/entities/fee-schedule.entity';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';

describe('CreateAdmissionApplicationUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const attempts: jest.Mocked<AdmissionPaymentAttemptRepositoryPort> = {
    findById: jest.fn(),
    save: jest.fn(),
  };
  const grades: jest.Mocked<GradeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const academicYears: jest.Mocked<AcademicYearRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const feeSchedules: jest.Mocked<FeeScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const gateway: jest.Mocked<PaymentGatewayPort> = {
    createCheckoutPreference: jest.fn(),
    getPaymentInfo: jest.fn(),
  };

  const useCase = new CreateAdmissionApplicationUseCase(
    applications,
    attempts,
    grades,
    academicYears,
    feeSchedules,
    gateway,
  );

  const input = {
    studentFirstName: 'Juan',
    studentLastName: 'Pérez',
    studentBirthDate: '2015-05-20',
    studentDocumentType: 'TI' as const,
    studentDocumentNumber: '1098765432',
    studentAddress: 'Calle 1 # 2-3',
    gradeId: 'grade-1',
    guardianName: 'María Pérez',
    guardianEmail: 'maria@test.com',
    guardianPhone: '3001234567',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    grades.findById.mockResolvedValue(new Grade('grade-1', 'Sexto', 'Bachillerato', 7));
    academicYears.findAll.mockResolvedValue([
      new AcademicYear('year-2026', '2026', new Date('2026-01-01'), new Date('2026-12-15'), 'active'),
    ]);
    applications.findPendingByDocumentNumber.mockResolvedValue(null);
    feeSchedules.findOne.mockResolvedValue(
      new FeeSchedule('fs-1', 'grade-1', 'year-2026', 'solicitud_admision', 150000),
    );
    gateway.createCheckoutPreference.mockResolvedValue({
      preferenceId: 'pref-1',
      checkoutUrl: 'https://mercadopago.test/checkout/pref-1',
    });
  });

  it('rechaza si el grado no existe', async () => {
    grades.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(applications.save).not.toHaveBeenCalled();
  });

  it('rechaza si no hay un año lectivo activo', async () => {
    academicYears.findAll.mockResolvedValue([
      new AcademicYear('year-2025', '2025', new Date('2025-01-01'), new Date('2025-12-15'), 'closed'),
    ]);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si ya hay una solicitud en curso para ese documento', async () => {
    applications.findPendingByDocumentNumber.mockResolvedValue(
      new AdmissionApplication(
        'app-0', 'SOL-AAAAAA', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1',
        'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
        'pendiente_pago', 150000, null, null, null, null, null, null, '2026-01-01T00:00:00.000Z',
      ),
    );

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(applications.save).not.toHaveBeenCalled();
  });

  it('rechaza si no hay precio configurado para ese grado', async () => {
    feeSchedules.findOne.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('crea la solicitud, arma el checkout, y devuelve trackingCode + checkoutUrl', async () => {
    const result = await useCase.execute(input);

    expect(result.checkoutUrl).toBe('https://mercadopago.test/checkout/pref-1');
    expect(result.trackingCode).toMatch(/^SOL-/);
    expect(applications.save).toHaveBeenCalledTimes(1);
    expect(attempts.save).toHaveBeenCalledTimes(1);

    const savedApplication = applications.save.mock.calls[0][0];
    expect(savedApplication.status).toBe('pendiente_pago');
    expect(savedApplication.feeAmount).toBe(150000);
    expect(savedApplication.academicYearId).toBe('year-2026');

    expect(gateway.createCheckoutPreference).toHaveBeenCalledWith({
      externalReference: expect.any(String),
      payerEmail: 'maria@test.com',
      item: { title: 'Solicitud de admisión — Sexto', amount: 150000 },
    });
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/create-admission-application -v`
Expected: FAIL — "Cannot find module './create-admission-application.use-case'"

- [ ] **Step 3: Implementar el DTO**

```ts
// apps/api/src/modules/admissions/interface/dtos/create-admission-application.dto.ts
import { IsDateString, IsEmail, IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { DocumentType } from '../../../identity/domain/entities/user.entity';

const KNOWN_DOCUMENT_TYPES: DocumentType[] = ['RC', 'TI', 'CC', 'CE', 'PA'];

export class CreateAdmissionApplicationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  studentFirstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  studentLastName: string;

  @IsDateString()
  studentBirthDate: string;

  @IsIn(KNOWN_DOCUMENT_TYPES)
  studentDocumentType: DocumentType;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  studentDocumentNumber: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  studentAddress: string;

  @IsUUID()
  gradeId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  guardianName: string;

  @IsEmail()
  guardianEmail: string;

  @IsString()
  @MinLength(7)
  @MaxLength(20)
  guardianPhone: string;
}
```

- [ ] **Step 4: Implementar el caso de uso**

```ts
// apps/api/src/modules/admissions/application/use-cases/create-admission-application.use-case.ts
import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from '../ports/admission-payment-attempt.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { FeeScheduleRepositoryPort } from '../../../finance/application/ports/fee-schedule.repository.port';
import { PaymentGatewayPort } from '../../../finance/application/ports/payment-gateway.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';
import { AdmissionPaymentAttempt } from '../../domain/entities/admission-payment-attempt.entity';
import { DocumentType } from '../../../identity/domain/entities/user.entity';
import { generateTrackingCode } from '../services/generate-tracking-code';

export interface CreateAdmissionApplicationInput {
  studentFirstName: string;
  studentLastName: string;
  studentBirthDate: string;
  studentDocumentType: DocumentType;
  studentDocumentNumber: string;
  studentAddress: string;
  gradeId: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
}

export interface CreateAdmissionApplicationOutput {
  trackingCode: string;
  checkoutUrl: string;
}

@Injectable()
export class CreateAdmissionApplicationUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    @Inject(AdmissionPaymentAttemptRepositoryPort) private readonly attempts: AdmissionPaymentAttemptRepositoryPort,
    @Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort,
    @Inject(AcademicYearRepositoryPort) private readonly academicYears: AcademicYearRepositoryPort,
    @Inject(FeeScheduleRepositoryPort) private readonly feeSchedules: FeeScheduleRepositoryPort,
    @Inject(PaymentGatewayPort) private readonly gateway: PaymentGatewayPort,
  ) {}

  async execute(input: CreateAdmissionApplicationInput): Promise<CreateAdmissionApplicationOutput> {
    const grade = await this.grades.findById(input.gradeId);
    if (!grade) {
      throw new NotFoundException(`No existe el grado "${input.gradeId}"`);
    }

    const years = await this.academicYears.findAll();
    const activeYear = years.find((y) => y.status === 'active');
    if (!activeYear) {
      throw new NotFoundException('No hay un año lectivo activo configurado');
    }

    const existingPending = await this.applications.findPendingByDocumentNumber(
      input.studentDocumentNumber,
    );
    if (existingPending) {
      throw new ConflictException('Ya existe una solicitud en curso para ese número de documento');
    }

    const feeSchedule = await this.feeSchedules.findOne(
      input.gradeId,
      activeYear.id,
      'solicitud_admision',
    );
    if (!feeSchedule) {
      throw new NotFoundException('No hay un precio de solicitud configurado para ese grado');
    }

    const application = new AdmissionApplication(
      randomUUID(),
      generateTrackingCode(),
      input.studentFirstName,
      input.studentLastName,
      input.studentBirthDate,
      input.studentDocumentType,
      input.studentDocumentNumber,
      input.studentAddress,
      input.gradeId,
      activeYear.id,
      input.guardianName,
      input.guardianEmail,
      input.guardianPhone,
      'pendiente_pago',
      feeSchedule.amount,
      null,
      null,
      null,
      null,
      null,
      null,
      new Date().toISOString(),
    );
    await this.applications.save(application);

    const attemptId = randomUUID();
    const { preferenceId, checkoutUrl } = await this.gateway.createCheckoutPreference({
      externalReference: attemptId,
      payerEmail: input.guardianEmail,
      item: { title: `Solicitud de admisión — ${grade.name}`, amount: feeSchedule.amount },
    });

    const attempt = new AdmissionPaymentAttempt(
      attemptId,
      application.id,
      preferenceId,
      feeSchedule.amount,
      'pending',
      new Date().toISOString(),
    );
    await this.attempts.save(attempt);

    return { trackingCode: application.trackingCode, checkoutUrl };
  }
}
```

- [ ] **Step 5: Correr el test y ver que pasa**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/create-admission-application -v`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/admissions
git commit -m "feat(admissions): agrega CreateAdmissionApplicationUseCase"
```

---

## Task 5: `HandleAdmissionPaymentWebhookUseCase`

**Files:**
- Create: `apps/api/src/modules/admissions/application/use-cases/handle-admission-payment-webhook.use-case.ts`
- Create: `apps/api/src/modules/admissions/application/use-cases/handle-admission-payment-webhook.use-case.spec.ts`

**Interfaces:**
- Consumes: `AdmissionApplicationRepositoryPort`, `AdmissionPaymentAttemptRepositoryPort` (Task 3); `PaymentGatewayPort.getPaymentInfo(gatewayPaymentId): Promise<{status: 'approved'|'pending'|'rejected', paymentMethodId: string, externalReference: string|null}>` (ya existe en `finance`).
- Produces: `PaymentWebhookInput` (`{type?: string, data?: {id?: string}}` — mismo shape que `finance`'s `HandlePaymentWebhookUseCase`), clase `HandleAdmissionPaymentWebhookUseCase`. Lo usa el controlador de Task 7.

- [ ] **Step 1: Escribir el test**

```ts
// apps/api/src/modules/admissions/application/use-cases/handle-admission-payment-webhook.use-case.spec.ts
import { HandleAdmissionPaymentWebhookUseCase } from './handle-admission-payment-webhook.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from '../ports/admission-payment-attempt.repository.port';
import { PaymentGatewayPort } from '../../../finance/application/ports/payment-gateway.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';
import { AdmissionPaymentAttempt } from '../../domain/entities/admission-payment-attempt.entity';

describe('HandleAdmissionPaymentWebhookUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const attempts: jest.Mocked<AdmissionPaymentAttemptRepositoryPort> = {
    findById: jest.fn(),
    save: jest.fn(),
  };
  const gateway: jest.Mocked<PaymentGatewayPort> = {
    createCheckoutPreference: jest.fn(),
    getPaymentInfo: jest.fn(),
  };

  const useCase = new HandleAdmissionPaymentWebhookUseCase(applications, attempts, gateway);

  const buildApplication = () =>
    new AdmissionApplication(
      'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1',
      'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
      'pendiente_pago', 150000, null, null, null, null, null, null, '2026-01-01T00:00:00.000Z',
    );
  const buildAttempt = (status: 'pending' | 'approved' | 'rejected' = 'pending') =>
    new AdmissionPaymentAttempt('att-1', 'app-1', 'pref-1', 150000, status, '2026-01-01T00:00:00.000Z');

  beforeEach(() => jest.clearAllMocks());

  it('ignora notificaciones que no son de tipo payment', async () => {
    await useCase.execute({ type: 'other', data: { id: 'pay-1' } });
    expect(gateway.getPaymentInfo).not.toHaveBeenCalled();
  });

  it('ignora si el intento no existe (webhook de otro pago)', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'visa',
      externalReference: 'att-desconocido',
    });
    attempts.findById.mockResolvedValue(null);

    await useCase.execute({ type: 'payment', data: { id: 'pay-1' } });
    expect(applications.save).not.toHaveBeenCalled();
  });

  it('no hace nada si el intento ya estaba approved (idempotencia)', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'visa',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(buildAttempt('approved'));

    await useCase.execute({ type: 'payment', data: { id: 'pay-1' } });
    expect(applications.save).not.toHaveBeenCalled();
    expect(attempts.save).not.toHaveBeenCalled();
  });

  it('con pago approved: marca el intento approved y la solicitud pendiente_entrevista', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'visa',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(buildAttempt('pending'));
    applications.findById.mockResolvedValue(buildApplication());

    await useCase.execute({ type: 'payment', data: { id: 'pay-1' } });

    expect(attempts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
    expect(applications.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pendiente_entrevista' }),
    );
  });

  it('con pago rejected: marca el intento rejected y no toca la solicitud', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'rejected',
      paymentMethodId: 'visa',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(buildAttempt('pending'));

    await useCase.execute({ type: 'payment', data: { id: 'pay-1' } });

    expect(attempts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }));
    expect(applications.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/handle-admission-payment-webhook -v`
Expected: FAIL — "Cannot find module './handle-admission-payment-webhook.use-case'"

- [ ] **Step 3: Implementar el caso de uso**

```ts
// apps/api/src/modules/admissions/application/use-cases/handle-admission-payment-webhook.use-case.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from '../ports/admission-payment-attempt.repository.port';
import { PaymentGatewayPort } from '../../../finance/application/ports/payment-gateway.port';

export interface AdmissionPaymentWebhookInput {
  type?: string;
  data?: { id?: string };
}

/**
 * Mismo criterio que `HandlePaymentWebhookUseCase` de `finance`: el webhook
 * solo notifica que "algo pasó" — hay que consultar el estado real, y es
 * idempotente porque MercadoPago puede reintentar la notificación.
 */
@Injectable()
export class HandleAdmissionPaymentWebhookUseCase {
  private readonly logger = new Logger(HandleAdmissionPaymentWebhookUseCase.name);

  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    @Inject(AdmissionPaymentAttemptRepositoryPort) private readonly attempts: AdmissionPaymentAttemptRepositoryPort,
    @Inject(PaymentGatewayPort) private readonly gateway: PaymentGatewayPort,
  ) {}

  async execute(input: AdmissionPaymentWebhookInput): Promise<void> {
    if (input.type !== 'payment' || !input.data?.id) return;

    const info = await this.gateway.getPaymentInfo(input.data.id);
    if (!info.externalReference) return;

    const attempt = await this.attempts.findById(info.externalReference);
    if (!attempt) {
      this.logger.warn(`Webhook de admisión para un intento desconocido: ${info.externalReference}`);
      return;
    }

    if (attempt.status === 'approved') return;

    if (info.status === 'approved') {
      attempt.approve();
      await this.attempts.save(attempt);

      const application = await this.applications.findById(attempt.admissionApplicationId);
      if (application) {
        application.markPaid();
        await this.applications.save(application);
      }
    } else if (info.status === 'rejected') {
      attempt.reject();
      await this.attempts.save(attempt);
    }
  }
}
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/handle-admission-payment-webhook -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/admissions
git commit -m "feat(admissions): agrega HandleAdmissionPaymentWebhookUseCase"
```

---

## Task 6: `GetAdmissionApplicationStatusUseCase`

**Files:**
- Create: `apps/api/src/modules/admissions/application/use-cases/get-admission-application-status.use-case.ts`
- Create: `apps/api/src/modules/admissions/application/use-cases/get-admission-application-status.use-case.spec.ts`

**Interfaces:**
- Consumes: `AdmissionApplicationRepositoryPort` (Task 3); `GradeRepositoryPort` (academic).
- Produces: `AdmissionStatusOutput` (`{status, gradeName, createdAt}`), clase `GetAdmissionApplicationStatusUseCase`. Lo usa el controlador de Task 7.

- [ ] **Step 1: Escribir el test**

```ts
// apps/api/src/modules/admissions/application/use-cases/get-admission-application-status.use-case.spec.ts
import { NotFoundException } from '@nestjs/common';
import { GetAdmissionApplicationStatusUseCase } from './get-admission-application-status.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';
import { Grade } from '../../../academic/domain/entities/grade.entity';

describe('GetAdmissionApplicationStatusUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const grades: jest.Mocked<GradeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new GetAdmissionApplicationStatusUseCase(applications, grades);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza con 404 genérico si el código no existe', async () => {
    applications.findByTrackingCode.mockResolvedValue(null);

    await expect(useCase.execute('SOL-INVALID')).rejects.toThrow(NotFoundException);
  });

  it('devuelve solo status, gradeName y createdAt — nada más', async () => {
    applications.findByTrackingCode.mockResolvedValue(
      new AdmissionApplication(
        'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1',
        'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
        'pendiente_entrevista', 150000, '2026-01-02T00:00:00.000Z', null, null, null, null, null,
        '2026-01-01T00:00:00.000Z',
      ),
    );
    grades.findById.mockResolvedValue(new Grade('grade-1', 'Sexto', 'Bachillerato', 7));

    const result = await useCase.execute('SOL-A8F3K2');

    expect(result).toEqual({
      status: 'pendiente_entrevista',
      gradeName: 'Sexto',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/get-admission-application-status -v`
Expected: FAIL — "Cannot find module './get-admission-application-status.use-case'"

- [ ] **Step 3: Implementar el caso de uso**

```ts
// apps/api/src/modules/admissions/application/use-cases/get-admission-application-status.use-case.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AdmissionStatus } from '../../domain/entities/admission-application.entity';

export interface AdmissionStatusOutput {
  status: AdmissionStatus;
  gradeName: string;
  createdAt: string;
}

@Injectable()
export class GetAdmissionApplicationStatusUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    @Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort,
  ) {}

  async execute(trackingCode: string): Promise<AdmissionStatusOutput> {
    const application = await this.applications.findByTrackingCode(trackingCode);
    if (!application) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    const grade = await this.grades.findById(application.gradeId);
    return {
      status: application.status,
      gradeName: grade?.name ?? '',
      createdAt: application.createdAt,
    };
  }
}
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/get-admission-application-status -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/admissions
git commit -m "feat(admissions): agrega GetAdmissionApplicationStatusUseCase"
```

---

## Task 7: Controladores públicos + wiring del módulo + CASL

**Files:**
- Create: `apps/api/src/modules/admissions/interface/controllers/admission-public.controller.ts`
- Create: `apps/api/src/modules/admissions/interface/controllers/admission-webhook.controller.ts`
- Create: `apps/api/src/modules/admissions/admissions.module.ts`
- Modify: `apps/api/src/app.module.ts` (registrar `AdmissionsModule`)
- Modify: `apps/api/src/core/auth/casl/ability.ts` (agregar `'Admission'` a `AppSubjects`)
- Modify: `apps/api/src/core/auth/casl/ability.factory.ts` (agregar `'Admission'` a los arrays de `directivo` y `secretaria`)

**Interfaces:**
- Consumes: `CreateAdmissionApplicationUseCase` (Task 4), `HandleAdmissionPaymentWebhookUseCase` (Task 5), `GetAdmissionApplicationStatusUseCase` (Task 6), `CreateAdmissionApplicationDto` (Task 4). `verifyMercadoPagoSignature` de `apps/api/src/modules/finance/infrastructure/payment-gateway/verify-mercadopago-signature.ts` (ya existe, firma: `({secret, xSignature, xRequestId, dataId}) => boolean`).
- Produces: rutas HTTP `POST /admissions/applications`, `GET /admissions/applications/status/:trackingCode`, `POST /admissions/webhooks/payment` — todas públicas. Subject CASL `'Admission'` listo para que Task 10 lo use en el controlador autenticado.

No hay test unitario de controlador en este codebase (ningún módulo los tiene) — este task se verifica con `curl`/manual contra el server corriendo.

- [ ] **Step 1: Controlador público (crear + consultar estado)**

```ts
// apps/api/src/modules/admissions/interface/controllers/admission-public.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../../core/auth/public.decorator';
import { CreateAdmissionApplicationUseCase } from '../../application/use-cases/create-admission-application.use-case';
import { GetAdmissionApplicationStatusUseCase } from '../../application/use-cases/get-admission-application-status.use-case';
import { CreateAdmissionApplicationDto } from '../dtos/create-admission-application.dto';

@Controller('admissions/applications')
@Public()
export class AdmissionPublicController {
  constructor(
    private readonly createApplication: CreateAdmissionApplicationUseCase,
    private readonly getStatus: GetAdmissionApplicationStatusUseCase,
  ) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(@Body() dto: CreateAdmissionApplicationDto) {
    return this.createApplication.execute(dto);
  }

  @Get('status/:trackingCode')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async status(@Param('trackingCode') trackingCode: string) {
    return this.getStatus.execute(trackingCode);
  }
}
```

- [ ] **Step 2: Controlador de webhook**

```ts
// apps/api/src/modules/admissions/interface/controllers/admission-webhook.controller.ts
import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../../../core/auth/public.decorator';
import {
  HandleAdmissionPaymentWebhookUseCase,
  AdmissionPaymentWebhookInput,
} from '../../application/use-cases/handle-admission-payment-webhook.use-case';
import { verifyMercadoPagoSignature } from '../../../finance/infrastructure/payment-gateway/verify-mercadopago-signature';

@Controller('admissions/webhooks')
@Public()
export class AdmissionWebhookController {
  constructor(
    private readonly handleWebhook: HandleAdmissionPaymentWebhookUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post('payment')
  @HttpCode(200)
  async webhook(
    @Body() body: AdmissionPaymentWebhookInput,
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
  ) {
    if (body.data?.id) {
      const valid = verifyMercadoPagoSignature({
        secret: this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET'),
        xSignature,
        xRequestId,
        dataId: body.data.id,
      });
      if (!valid) throw new UnauthorizedException('Firma de webhook inválida');
    }

    await this.handleWebhook.execute(body);
    return { ok: true };
  }
}
```

- [ ] **Step 3: Agregar `'Admission'` a los subjects de CASL**

En `apps/api/src/core/auth/casl/ability.ts`, en el tipo `AppSubjects`, agregar `| 'Admission'` (por ejemplo después de `'Report'`, antes de `'all'`).

- [ ] **Step 4: Dar `manage('Admission')` a directivo y secretaria**

En `apps/api/src/core/auth/casl/ability.factory.ts`, agregar `'Admission'` al array de `can('manage', [...])` del bloque `if (roles.includes('directivo'))` (línea ~23-45) y al del bloque `if (roles.includes('secretaria'))` (línea ~70) — `admin_institucion` ya lo cubre vía `can('manage', 'all')`.

- [ ] **Step 5: Módulo de Admissions**

```ts
// apps/api/src/modules/admissions/admissions.module.ts
import { Module } from '@nestjs/common';
import { AdmissionPublicController } from './interface/controllers/admission-public.controller';
import { AdmissionWebhookController } from './interface/controllers/admission-webhook.controller';
import { CreateAdmissionApplicationUseCase } from './application/use-cases/create-admission-application.use-case';
import { HandleAdmissionPaymentWebhookUseCase } from './application/use-cases/handle-admission-payment-webhook.use-case';
import { GetAdmissionApplicationStatusUseCase } from './application/use-cases/get-admission-application-status.use-case';
import { AdmissionApplicationRepositoryPort } from './application/ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from './application/ports/admission-payment-attempt.repository.port';
import { TypeOrmAdmissionApplicationRepository } from './infrastructure/repositories/typeorm-admission-application.repository';
import { TypeOrmAdmissionPaymentAttemptRepository } from './infrastructure/repositories/typeorm-admission-payment-attempt.repository';
import { AcademicModule } from '../academic/academic.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [AcademicModule, FinanceModule],
  controllers: [AdmissionPublicController, AdmissionWebhookController],
  providers: [
    CreateAdmissionApplicationUseCase,
    HandleAdmissionPaymentWebhookUseCase,
    GetAdmissionApplicationStatusUseCase,
    { provide: AdmissionApplicationRepositoryPort, useClass: TypeOrmAdmissionApplicationRepository },
    { provide: AdmissionPaymentAttemptRepositoryPort, useClass: TypeOrmAdmissionPaymentAttemptRepository },
  ],
})
export class AdmissionsModule {}
```

- [ ] **Step 6: `FinanceModule` debe exportar lo que `AdmissionsModule` necesita**

En `apps/api/src/modules/finance/finance.module.ts:73`, cambiar:

```ts
exports: [ChargeRepositoryPort, PaymentRepositoryPort],
```

por:

```ts
exports: [ChargeRepositoryPort, PaymentRepositoryPort, PaymentGatewayPort, FeeScheduleRepositoryPort],
```

- [ ] **Step 7: Registrar el módulo en `AppModule`**

En `apps/api/src/app.module.ts`, importar `AdmissionsModule` desde `'./modules/admissions/admissions.module'` y agregarlo al array de `imports` (junto a `AcademicModule`/`EnrollmentModule`, respetando el orden alfabético/temático que ya tenga el archivo).

- [ ] **Step 8: Levantar el server y probar manualmente**

Run: `cd apps/api && pnpm build` — Expected: sin errores.

Levantar el server (`pnpm dev` en una terminal aparte o en background) y probar:

```bash
curl -X POST http://localhost:3001/admissions/applications \
  -H "content-type: application/json" \
  -H "x-tenant-subdomain: colegio-demo" \
  -d '{"studentFirstName":"Ana","studentLastName":"Gómez","studentBirthDate":"2016-03-10","studentDocumentType":"TI","studentDocumentNumber":"1122334455","studentAddress":"Calle 5 # 6-7","gradeId":"<un-grade-id-real>","guardianName":"Carla Gómez","guardianEmail":"carla@test.com","guardianPhone":"3009876543"}'
```

Expected: si no hay un `FeeSchedule` con concepto `solicitud_admision` para ese grado/año, responde 404 con `"No hay un precio de solicitud configurado para ese grado"` (esperado — configurarlo desde el panel de Finanzas antes de reintentar). Con el precio configurado, responde `{"trackingCode":"SOL-...", "checkoutUrl":"..."}`.

```bash
curl http://localhost:3001/admissions/applications/status/SOL-XXXXXX -H "x-tenant-subdomain: colegio-demo"
```

Expected: `{"status":"pendiente_pago","gradeName":"...","createdAt":"..."}`.

- [ ] **Step 9: Verificar que el `@Throttle` reforzado corta después del límite**

```bash
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    http://localhost:3001/admissions/applications/status/SOL-XXXXXX \
    -H "x-tenant-subdomain: colegio-demo"
done
```

Expected: las primeras 10 respuestas son `404` (código inexistente, pero pasa el throttle) y la 11ª es `429` (Too Many Requests) — confirma que el límite de 10/min configurado en `AdmissionPublicController.status()` corta, no el límite global de 20/min.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/admissions apps/api/src/modules/finance/finance.module.ts \
        apps/api/src/app.module.ts apps/api/src/core/auth/casl
git commit -m "feat(admissions): agrega controladores públicos, módulo, y subject CASL Admission"
```

---

## Task 8: `ListAdmissionApplicationsUseCase` + `RecordAdmissionInterviewUseCase`

**Files:**
- Create: `apps/api/src/modules/admissions/application/use-cases/list-admission-applications.use-case.ts`
- Create: `apps/api/src/modules/admissions/application/use-cases/list-admission-applications.use-case.spec.ts`
- Create: `apps/api/src/modules/admissions/application/use-cases/record-admission-interview.use-case.ts`
- Create: `apps/api/src/modules/admissions/application/use-cases/record-admission-interview.use-case.spec.ts`
- Create: `apps/api/src/modules/admissions/interface/dtos/record-admission-interview.dto.ts`

**Interfaces:**
- Consumes: `AdmissionApplicationRepositoryPort` (Task 3).
- Produces: `ListAdmissionApplicationsUseCase`, `RecordAdmissionInterviewUseCase`, `RecordAdmissionInterviewDto`. Los usa el controlador de Task 10.

- [ ] **Step 1: Test de `ListAdmissionApplicationsUseCase`**

```ts
// apps/api/src/modules/admissions/application/use-cases/list-admission-applications.use-case.spec.ts
import { ListAdmissionApplicationsUseCase } from './list-admission-applications.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';

describe('ListAdmissionApplicationsUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new ListAdmissionApplicationsUseCase(applications);

  beforeEach(() => jest.clearAllMocks());

  it('delega el filtro de status al repositorio', async () => {
    applications.findAll.mockResolvedValue([]);

    await useCase.execute('pendiente_entrevista');

    expect(applications.findAll).toHaveBeenCalledWith({ status: 'pendiente_entrevista' });
  });

  it('sin filtro, pide todas', async () => {
    applications.findAll.mockResolvedValue([]);

    await useCase.execute(undefined);

    expect(applications.findAll).toHaveBeenCalledWith(undefined);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/list-admission-applications -v`
Expected: FAIL

- [ ] **Step 3: Implementar**

```ts
// apps/api/src/modules/admissions/application/use-cases/list-admission-applications.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';

@Injectable()
export class ListAdmissionApplicationsUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
  ) {}

  async execute(status: AdmissionStatus | undefined): Promise<AdmissionApplication[]> {
    return this.applications.findAll(status ? { status } : undefined);
  }
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/list-admission-applications -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Test de `RecordAdmissionInterviewUseCase`**

```ts
// apps/api/src/modules/admissions/application/use-cases/record-admission-interview.use-case.spec.ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RecordAdmissionInterviewUseCase } from './record-admission-interview.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';

describe('RecordAdmissionInterviewUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new RecordAdmissionInterviewUseCase(applications);

  const build = (status: 'pendiente_pago' | 'pendiente_entrevista' | 'aceptada' | 'rechazada') =>
    new AdmissionApplication(
      'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1',
      'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
      status, 150000, null, null, null, null, null, null, '2026-01-01T00:00:00.000Z',
    );

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si la solicitud no existe', async () => {
    applications.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('app-1', { interviewDate: '2026-02-01T10:00:00.000Z', interviewNotes: null }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza si la solicitud no está pendiente_entrevista', async () => {
    applications.findById.mockResolvedValue(build('pendiente_pago'));

    await expect(
      useCase.execute('app-1', { interviewDate: '2026-02-01T10:00:00.000Z', interviewNotes: null }),
    ).rejects.toThrow(ConflictException);
  });

  it('registra fecha y notas', async () => {
    applications.findById.mockResolvedValue(build('pendiente_entrevista'));

    const result = await useCase.execute('app-1', {
      interviewDate: '2026-02-01T10:00:00.000Z',
      interviewNotes: 'Buena entrevista',
    });

    expect(result.interviewDate).toBe('2026-02-01T10:00:00.000Z');
    expect(result.interviewNotes).toBe('Buena entrevista');
    expect(applications.save).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 6: Correr y ver que falla**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/record-admission-interview -v`
Expected: FAIL

- [ ] **Step 7: Implementar el DTO**

```ts
// apps/api/src/modules/admissions/interface/dtos/record-admission-interview.dto.ts
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordAdmissionInterviewDto {
  @IsDateString()
  interviewDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  interviewNotes?: string;
}
```

- [ ] **Step 8: Implementar el caso de uso**

```ts
// apps/api/src/modules/admissions/application/use-cases/record-admission-interview.use-case.ts
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';

export interface RecordAdmissionInterviewInput {
  interviewDate: string;
  interviewNotes: string | null;
}

@Injectable()
export class RecordAdmissionInterviewUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
  ) {}

  async execute(id: string, input: RecordAdmissionInterviewInput): Promise<AdmissionApplication> {
    const application = await this.applications.findById(id);
    if (!application) {
      throw new NotFoundException(`No existe la solicitud "${id}"`);
    }
    if (application.status !== 'pendiente_entrevista') {
      throw new ConflictException('Solo se puede registrar entrevista en solicitudes pendientes de entrevista');
    }
    application.recordInterview(input.interviewDate, input.interviewNotes);
    await this.applications.save(application);
    return application;
  }
}
```

- [ ] **Step 9: Correr y ver que pasa**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/record-admission-interview -v`
Expected: PASS (3 tests)

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/admissions
git commit -m "feat(admissions): agrega ListAdmissionApplicationsUseCase y RecordAdmissionInterviewUseCase"
```

---

## Task 9: `AcceptAdmissionApplicationUseCase` + `RejectAdmissionApplicationUseCase`

**Files:**
- Create: `apps/api/src/modules/admissions/application/use-cases/accept-admission-application.use-case.ts`
- Create: `apps/api/src/modules/admissions/application/use-cases/accept-admission-application.use-case.spec.ts`
- Create: `apps/api/src/modules/admissions/application/use-cases/reject-admission-application.use-case.ts`
- Create: `apps/api/src/modules/admissions/application/use-cases/reject-admission-application.use-case.spec.ts`
- Create: `apps/api/src/modules/admissions/interface/dtos/reject-admission-application.dto.ts`

**Interfaces:**
- Consumes: `AdmissionApplicationRepositoryPort` (Task 3); `UserRepositoryPort.findByDocumentNumber(documentNumber): Promise<User|null>` (`apps/api/src/modules/identity/application/ports/user.repository.port.ts`, ya existe).
- Produces: `AcceptAdmissionApplicationOutput` (`{application, matchedUserId, prefill: {firstName, lastName, birthDate, documentType, documentNumber, address, gradeId, academicYearId}}`), `RejectAdmissionApplicationDto`. Los usa el controlador de Task 10 y el frontend de Task 13 (el shape de `prefill` es justo lo que necesita el modal de "Estudiante nuevo").

- [ ] **Step 1: Test de `AcceptAdmissionApplicationUseCase`**

```ts
// apps/api/src/modules/admissions/application/use-cases/accept-admission-application.use-case.spec.ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AcceptAdmissionApplicationUseCase } from './accept-admission-application.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';
import { User } from '../../../identity/domain/entities/user.entity';

describe('AcceptAdmissionApplicationUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new AcceptAdmissionApplicationUseCase(applications, users);

  const build = (status: AdmissionStatus) =>
    new AdmissionApplication(
      'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1 # 2-3',
      'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
      status, 150000, '2026-01-02T00:00:00.000Z', '2026-01-05T10:00:00.000Z', 'Bien', null, null, null,
      '2026-01-01T00:00:00.000Z',
    );

  beforeEach(() => {
    jest.clearAllMocks();
    users.findByDocumentNumber.mockResolvedValue(null);
  });

  it('rechaza si la solicitud no existe', async () => {
    applications.findById.mockResolvedValue(null);

    await expect(useCase.execute('app-1')).rejects.toThrow(NotFoundException);
  });

  it('rechaza si no está pendiente_entrevista', async () => {
    applications.findById.mockResolvedValue(build('pendiente_pago'));

    await expect(useCase.execute('app-1')).rejects.toThrow(ConflictException);
  });

  it('aspirante nuevo (sin coincidencia de documento): matchedUserId null y prefill completo', async () => {
    applications.findById.mockResolvedValue(build('pendiente_entrevista'));
    users.findByDocumentNumber.mockResolvedValue(null);

    const result = await useCase.execute('app-1');

    expect(result.matchedUserId).toBeNull();
    expect(result.prefill).toEqual({
      firstName: 'Juan',
      lastName: 'Pérez',
      birthDate: '2015-05-20',
      documentType: 'TI',
      documentNumber: '1098765432',
      address: 'Calle 1 # 2-3',
      gradeId: 'grade-1',
      academicYearId: 'year-2026',
    });
    expect(result.application.status).toBe('aceptada');
    expect(applications.save).toHaveBeenCalledTimes(1);
  });

  it('estudiante de regreso (coincide el documento): matchedUserId con el id del usuario existente', async () => {
    applications.findById.mockResolvedValue(build('pendiente_entrevista'));
    users.findByDocumentNumber.mockResolvedValue(
      new User('user-99', 'juan.viejo@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active'),
    );

    const result = await useCase.execute('app-1');

    expect(result.matchedUserId).toBe('user-99');
    expect(result.application.matchedUserId).toBe('user-99');
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/accept-admission-application -v`
Expected: FAIL

- [ ] **Step 3: Implementar**

```ts
// apps/api/src/modules/admissions/application/use-cases/accept-admission-application.use-case.ts
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';
import { DocumentType } from '../../../identity/domain/entities/user.entity';

export interface AcceptAdmissionApplicationOutput {
  application: AdmissionApplication;
  matchedUserId: string | null;
  prefill: {
    firstName: string;
    lastName: string;
    birthDate: string;
    documentType: DocumentType;
    documentNumber: string;
    address: string;
    gradeId: string;
    academicYearId: string;
  };
}

@Injectable()
export class AcceptAdmissionApplicationUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
  ) {}

  async execute(id: string): Promise<AcceptAdmissionApplicationOutput> {
    const application = await this.applications.findById(id);
    if (!application) {
      throw new NotFoundException(`No existe la solicitud "${id}"`);
    }
    if (application.status !== 'pendiente_entrevista') {
      throw new ConflictException('Solo se pueden aceptar solicitudes pendientes de entrevista');
    }

    const matchedUser = await this.users.findByDocumentNumber(application.studentDocumentNumber);
    application.accept(matchedUser?.id ?? null);
    await this.applications.save(application);

    return {
      application,
      matchedUserId: matchedUser?.id ?? null,
      prefill: {
        firstName: application.studentFirstName,
        lastName: application.studentLastName,
        birthDate: application.studentBirthDate,
        documentType: application.studentDocumentType,
        documentNumber: application.studentDocumentNumber,
        address: application.studentAddress,
        gradeId: application.gradeId,
        academicYearId: application.academicYearId,
      },
    };
  }
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/accept-admission-application -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Test de `RejectAdmissionApplicationUseCase`**

```ts
// apps/api/src/modules/admissions/application/use-cases/reject-admission-application.use-case.spec.ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RejectAdmissionApplicationUseCase } from './reject-admission-application.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';

describe('RejectAdmissionApplicationUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new RejectAdmissionApplicationUseCase(applications);

  const build = (status: AdmissionStatus) =>
    new AdmissionApplication(
      'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1',
      'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
      status, 150000, null, null, null, null, null, null, '2026-01-01T00:00:00.000Z',
    );

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si la solicitud no existe', async () => {
    applications.findById.mockResolvedValue(null);

    await expect(useCase.execute('app-1', 'No cumple requisitos')).rejects.toThrow(NotFoundException);
  });

  it('rechaza si no está pendiente_entrevista', async () => {
    applications.findById.mockResolvedValue(build('aceptada'));

    await expect(useCase.execute('app-1', 'No cumple requisitos')).rejects.toThrow(ConflictException);
  });

  it('rechaza la solicitud y guarda el motivo', async () => {
    applications.findById.mockResolvedValue(build('pendiente_entrevista'));

    const result = await useCase.execute('app-1', 'No cumple requisitos de edad');

    expect(result.status).toBe('rechazada');
    expect(result.rejectionReason).toBe('No cumple requisitos de edad');
    expect(applications.save).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 6: Correr y ver que falla**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/reject-admission-application -v`
Expected: FAIL

- [ ] **Step 7: Implementar el DTO**

```ts
// apps/api/src/modules/admissions/interface/dtos/reject-admission-application.dto.ts
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectAdmissionApplicationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  rejectionReason: string;
}
```

- [ ] **Step 8: Implementar el caso de uso**

```ts
// apps/api/src/modules/admissions/application/use-cases/reject-admission-application.use-case.ts
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';

@Injectable()
export class RejectAdmissionApplicationUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
  ) {}

  async execute(id: string, rejectionReason: string): Promise<AdmissionApplication> {
    const application = await this.applications.findById(id);
    if (!application) {
      throw new NotFoundException(`No existe la solicitud "${id}"`);
    }
    if (application.status !== 'pendiente_entrevista') {
      throw new ConflictException('Solo se pueden rechazar solicitudes pendientes de entrevista');
    }
    application.reject(rejectionReason);
    await this.applications.save(application);
    return application;
  }
}
```

- [ ] **Step 9: Correr y ver que pasa**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/reject-admission-application -v`
Expected: PASS (3 tests)

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/admissions
git commit -m "feat(admissions): agrega AcceptAdmissionApplicationUseCase y RejectAdmissionApplicationUseCase"
```

---

## Task 10: `LinkAdmissionEnrollmentUseCase` + controlador de gestión (staff) + permisos frontend

**Files:**
- Create: `apps/api/src/modules/admissions/application/use-cases/link-admission-enrollment.use-case.ts`
- Create: `apps/api/src/modules/admissions/application/use-cases/link-admission-enrollment.use-case.spec.ts`
- Create: `apps/api/src/modules/admissions/interface/dtos/link-admission-enrollment.dto.ts`
- Create: `apps/api/src/modules/admissions/interface/controllers/admission-management.controller.ts`
- Modify: `apps/api/src/modules/admissions/admissions.module.ts` (registrar el controlador y los 3 casos de uso nuevos de Tasks 8-10)
- Modify: `apps/web/src/lib/permissions.ts` (agregar `canManageAdmissions`)
- Modify: `apps/web/src/lib/nav-config.ts` (agregar el link de navegación)

**Interfaces:**
- Consumes: `AdmissionApplicationRepositoryPort` (Task 3); `ListAdmissionApplicationsUseCase`, `RecordAdmissionInterviewUseCase`, `RecordAdmissionInterviewDto` (Task 8); `AcceptAdmissionApplicationUseCase`, `RejectAdmissionApplicationUseCase`, `RejectAdmissionApplicationDto` (Task 9).
- Produces: rutas `GET /admissions/applications`, `PATCH /admissions/applications/:id/interview`, `PATCH /admissions/applications/:id/accept`, `PATCH /admissions/applications/:id/reject`, `PATCH /admissions/applications/:id/link-enrollment` — todas protegidas (`ability.can('manage', 'Admission')`). Función `canManageAdmissions(roles)` que usan las Tasks 12-13 en el frontend.

- [ ] **Step 1: Test de `LinkAdmissionEnrollmentUseCase`**

```ts
// apps/api/src/modules/admissions/application/use-cases/link-admission-enrollment.use-case.spec.ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LinkAdmissionEnrollmentUseCase } from './link-admission-enrollment.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';

describe('LinkAdmissionEnrollmentUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new LinkAdmissionEnrollmentUseCase(applications);

  const build = (status: AdmissionStatus, resultingEnrollmentId: string | null = null) =>
    new AdmissionApplication(
      'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1',
      'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
      status, 150000, null, null, null, null, null, resultingEnrollmentId, '2026-01-01T00:00:00.000Z',
    );

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si la solicitud no existe', async () => {
    applications.findById.mockResolvedValue(null);

    await expect(useCase.execute('app-1', 'enr-1')).rejects.toThrow(NotFoundException);
  });

  it('rechaza si no está aceptada', async () => {
    applications.findById.mockResolvedValue(build('pendiente_entrevista'));

    await expect(useCase.execute('app-1', 'enr-1')).rejects.toThrow(ConflictException);
  });

  it('rechaza si ya tiene una matrícula enlazada', async () => {
    applications.findById.mockResolvedValue(build('aceptada', 'enr-viejo'));

    await expect(useCase.execute('app-1', 'enr-1')).rejects.toThrow(ConflictException);
  });

  it('enlaza la matrícula', async () => {
    applications.findById.mockResolvedValue(build('aceptada', null));

    const result = await useCase.execute('app-1', 'enr-1');

    expect(result.resultingEnrollmentId).toBe('enr-1');
    expect(applications.save).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/link-admission-enrollment -v`
Expected: FAIL

- [ ] **Step 3: Implementar el DTO**

```ts
// apps/api/src/modules/admissions/interface/dtos/link-admission-enrollment.dto.ts
import { IsUUID } from 'class-validator';

export class LinkAdmissionEnrollmentDto {
  @IsUUID()
  enrollmentId: string;
}
```

- [ ] **Step 4: Implementar el caso de uso**

```ts
// apps/api/src/modules/admissions/application/use-cases/link-admission-enrollment.use-case.ts
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';

@Injectable()
export class LinkAdmissionEnrollmentUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
  ) {}

  async execute(id: string, enrollmentId: string): Promise<AdmissionApplication> {
    const application = await this.applications.findById(id);
    if (!application) {
      throw new NotFoundException(`No existe la solicitud "${id}"`);
    }
    if (application.status !== 'aceptada') {
      throw new ConflictException('Solo se puede enlazar la matrícula de una solicitud aceptada');
    }
    if (application.resultingEnrollmentId) {
      throw new ConflictException('Esta solicitud ya tiene una matrícula enlazada');
    }
    application.linkEnrollment(enrollmentId);
    await this.applications.save(application);
    return application;
  }
}
```

- [ ] **Step 5: Correr y ver que pasa**

Run: `cd apps/api && npx jest src/modules/admissions/application/use-cases/link-admission-enrollment -v`
Expected: PASS (4 tests)

- [ ] **Step 6: Controlador de gestión (staff)**

```ts
// apps/api/src/modules/admissions/interface/controllers/admission-management.controller.ts
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { ListAdmissionApplicationsUseCase } from '../../application/use-cases/list-admission-applications.use-case';
import { RecordAdmissionInterviewUseCase } from '../../application/use-cases/record-admission-interview.use-case';
import { AcceptAdmissionApplicationUseCase } from '../../application/use-cases/accept-admission-application.use-case';
import { RejectAdmissionApplicationUseCase } from '../../application/use-cases/reject-admission-application.use-case';
import { LinkAdmissionEnrollmentUseCase } from '../../application/use-cases/link-admission-enrollment.use-case';
import { RecordAdmissionInterviewDto } from '../dtos/record-admission-interview.dto';
import { RejectAdmissionApplicationDto } from '../dtos/reject-admission-application.dto';
import { LinkAdmissionEnrollmentDto } from '../dtos/link-admission-enrollment.dto';
import { AdmissionStatus } from '../../domain/entities/admission-application.entity';

@Controller('admissions/applications')
@CheckPolicies((ability) => ability.can('manage', 'Admission'))
export class AdmissionManagementController {
  constructor(
    private readonly listApplications: ListAdmissionApplicationsUseCase,
    private readonly recordInterview: RecordAdmissionInterviewUseCase,
    private readonly acceptApplication: AcceptAdmissionApplicationUseCase,
    private readonly rejectApplication: RejectAdmissionApplicationUseCase,
    private readonly linkEnrollment: LinkAdmissionEnrollmentUseCase,
  ) {}

  @Get()
  async list(@Query('status') status?: AdmissionStatus) {
    return this.listApplications.execute(status);
  }

  @Patch(':id/interview')
  async interview(@Param('id') id: string, @Body() dto: RecordAdmissionInterviewDto) {
    return this.recordInterview.execute(id, {
      interviewDate: dto.interviewDate,
      interviewNotes: dto.interviewNotes ?? null,
    });
  }

  @Patch(':id/accept')
  async accept(@Param('id') id: string) {
    return this.acceptApplication.execute(id);
  }

  @Patch(':id/reject')
  async reject(@Param('id') id: string, @Body() dto: RejectAdmissionApplicationDto) {
    return this.rejectApplication.execute(id, dto.rejectionReason);
  }

  @Patch(':id/link-enrollment')
  async link(@Param('id') id: string, @Body() dto: LinkAdmissionEnrollmentDto) {
    return this.linkEnrollment.execute(id, dto.enrollmentId);
  }
}
```

- [ ] **Step 7: Registrar todo en el módulo**

Reescribir `apps/api/src/modules/admissions/admissions.module.ts` agregando el controlador y los casos de uso nuevos:

```ts
// apps/api/src/modules/admissions/admissions.module.ts
import { Module } from '@nestjs/common';
import { AdmissionPublicController } from './interface/controllers/admission-public.controller';
import { AdmissionWebhookController } from './interface/controllers/admission-webhook.controller';
import { AdmissionManagementController } from './interface/controllers/admission-management.controller';
import { CreateAdmissionApplicationUseCase } from './application/use-cases/create-admission-application.use-case';
import { HandleAdmissionPaymentWebhookUseCase } from './application/use-cases/handle-admission-payment-webhook.use-case';
import { GetAdmissionApplicationStatusUseCase } from './application/use-cases/get-admission-application-status.use-case';
import { ListAdmissionApplicationsUseCase } from './application/use-cases/list-admission-applications.use-case';
import { RecordAdmissionInterviewUseCase } from './application/use-cases/record-admission-interview.use-case';
import { AcceptAdmissionApplicationUseCase } from './application/use-cases/accept-admission-application.use-case';
import { RejectAdmissionApplicationUseCase } from './application/use-cases/reject-admission-application.use-case';
import { LinkAdmissionEnrollmentUseCase } from './application/use-cases/link-admission-enrollment.use-case';
import { AdmissionApplicationRepositoryPort } from './application/ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from './application/ports/admission-payment-attempt.repository.port';
import { TypeOrmAdmissionApplicationRepository } from './infrastructure/repositories/typeorm-admission-application.repository';
import { TypeOrmAdmissionPaymentAttemptRepository } from './infrastructure/repositories/typeorm-admission-payment-attempt.repository';
import { AcademicModule } from '../academic/academic.module';
import { FinanceModule } from '../finance/finance.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [AcademicModule, FinanceModule, IdentityModule],
  controllers: [AdmissionPublicController, AdmissionWebhookController, AdmissionManagementController],
  providers: [
    CreateAdmissionApplicationUseCase,
    HandleAdmissionPaymentWebhookUseCase,
    GetAdmissionApplicationStatusUseCase,
    ListAdmissionApplicationsUseCase,
    RecordAdmissionInterviewUseCase,
    AcceptAdmissionApplicationUseCase,
    RejectAdmissionApplicationUseCase,
    LinkAdmissionEnrollmentUseCase,
    { provide: AdmissionApplicationRepositoryPort, useClass: TypeOrmAdmissionApplicationRepository },
    { provide: AdmissionPaymentAttemptRepositoryPort, useClass: TypeOrmAdmissionPaymentAttemptRepository },
  ],
})
export class AdmissionsModule {}
```

- [ ] **Step 8: Agregar `canManageAdmissions` en el frontend**

En `apps/web/src/lib/permissions.ts`, agregar (mismo criterio que `canManageFinance`: admin/directivo/secretaria):

```ts
/** Mismo criterio que `canManageFinance`: gestionar solicitudes de admisión es tarea de secretaría. */
export function canManageAdmissions(roles: string[]): boolean {
  return (
    roles.includes('admin_institucion') || roles.includes('directivo') || roles.includes('secretaria')
  );
}
```

- [ ] **Step 9: Agregar el link de navegación**

En `apps/web/src/lib/nav-config.ts`, agregar el ícono `UserPlus` al import de `lucide-react`, y una entrada en `NAV_LINKS` (después de `/enrollment`):

```ts
{ href: '/admissions', label: 'Admisiones', icon: UserPlus, roles: ADMIN_SECRETARIA },
```

- [ ] **Step 10: Build y verificación manual**

Run: `cd apps/api && pnpm build` — Expected: sin errores.

Correr el server, loguearse como `admin@colegio-demo.test`, y probar:

```bash
curl http://localhost:3001/admissions/applications -H "authorization: Bearer <token>" -H "x-tenant-subdomain: colegio-demo"
```

Expected: lista de solicitudes (probablemente vacía o con la creada en Task 7).

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/modules/admissions apps/web/src/lib/permissions.ts apps/web/src/lib/nav-config.ts
git commit -m "feat(admissions): agrega LinkAdmissionEnrollmentUseCase, controlador de gestión, y permisos frontend"
```

---

## Task 11: Frontend — tipos compartidos, hooks, y rutas BFF

**Files:**
- Modify: `packages/shared-types/src/index.ts` (agregar `AdmissionStatus`, `AdmissionApplication`, `AdmissionStatusResponse`)
- Create: `apps/web/src/features/admissions/use-admissions.ts`
- Create: `apps/web/src/app/api/admissions/applications/route.ts` (público: POST)
- Create: `apps/web/src/app/api/admissions/applications/status/[trackingCode]/route.ts` (público: GET)
- Create: `apps/web/src/app/api/admissions/management/route.ts` (staff: GET lista)
- Create: `apps/web/src/app/api/admissions/management/[id]/interview/route.ts` (staff: PATCH)
- Create: `apps/web/src/app/api/admissions/management/[id]/accept/route.ts` (staff: PATCH)
- Create: `apps/web/src/app/api/admissions/management/[id]/reject/route.ts` (staff: PATCH)
- Create: `apps/web/src/app/api/admissions/management/[id]/link-enrollment/route.ts` (staff: PATCH)

**Interfaces:**
- Produces: tipo `AdmissionApplication` (para la lista de staff), `AdmissionStatus`, hooks `useCreateAdmissionApplication()`, `useAdmissionStatus(trackingCode)`, `useAdmissionApplications(status?)`, `useRecordAdmissionInterview()`, `useAcceptAdmissionApplication()`, `useRejectAdmissionApplication()`, `useLinkAdmissionEnrollment()`. Los usan las Tasks 12 y 13.

Nota sobre las rutas BFF públicas (`api/admissions/applications` y `.../status/[trackingCode]`): a diferencia de `serverApiFetch` (que depende de la cookie de sesión — inútil acá porque no hay sesión), usan `fetch` directo con solo el header de tenant, mismo patrón que `getTenantBranding()` en `apps/web/src/lib/server-api.ts`.

- [ ] **Step 1: Tipos compartidos**

En `packages/shared-types/src/index.ts`, agregar (después de la sección de `Enrollment`, por ejemplo):

```ts
export type AdmissionStatus = 'pendiente_pago' | 'pendiente_entrevista' | 'aceptada' | 'rechazada';

export interface AdmissionApplication {
  id: string;
  trackingCode: string;
  studentFirstName: string;
  studentLastName: string;
  studentBirthDate: string;
  studentDocumentType: DocumentType;
  studentDocumentNumber: string;
  studentAddress: string;
  gradeId: string;
  academicYearId: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  status: AdmissionStatus;
  feeAmount: number;
  paidAt: string | null;
  interviewDate: string | null;
  interviewNotes: string | null;
  rejectionReason: string | null;
  matchedUserId: string | null;
  resultingEnrollmentId: string | null;
  createdAt: string;
}

export interface AdmissionStatusResponse {
  status: AdmissionStatus;
  gradeName: string;
  createdAt: string;
}

export interface AdmissionAcceptResponse {
  application: AdmissionApplication;
  matchedUserId: string | null;
  prefill: {
    firstName: string;
    lastName: string;
    birthDate: string;
    documentType: DocumentType;
    documentNumber: string;
    address: string;
    gradeId: string;
    academicYearId: string;
  };
}
```

`DocumentType` ya existe en `packages/shared-types/src/index.ts` (`export type DocumentType = 'RC' | 'TI' | 'CC' | 'CE' | 'PA'`) — también existe, duplicado, en `apps/web/src/features/users/use-users.ts:13`. Son estructuralmente idénticos así que no rompen nada entre sí, pero **no** dupliques el tipo de nuevo: para todo lo nuevo de este plan (`use-admissions.ts`, las páginas públicas), importar `DocumentType` desde `@eduapp/shared-types`.

- [ ] **Step 2: Ruta BFF pública — crear solicitud**

```ts
// apps/web/src/app/api/admissions/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/admissions/applications`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json({ message: data?.message ?? 'No se pudo enviar la solicitud' }, { status: res.status });
  }
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 3: Ruta BFF pública — consultar estado**

```ts
// apps/web/src/app/api/admissions/applications/status/[trackingCode]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET(_req: NextRequest, { params }: { params: { trackingCode: string } }) {
  const res = await fetch(
    `${API_URL}/admissions/applications/status/${encodeURIComponent(params.trackingCode)}`,
    { headers: { 'x-tenant-subdomain': TENANT_SUBDOMAIN }, cache: 'no-store' },
  );
  if (!res.ok) {
    return NextResponse.json({ message: 'Solicitud no encontrada' }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
```

- [ ] **Step 4: Rutas BFF de staff (autenticadas, vía `serverApiFetch`)**

```ts
// apps/web/src/app/api/admissions/management/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AdmissionApplication } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');
  const path = status
    ? `/admissions/applications?status=${encodeURIComponent(status)}`
    : '/admissions/applications';
  const applications = await serverApiFetch<AdmissionApplication[]>(path);
  if (applications === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(applications);
}
```

```ts
// apps/web/src/app/api/admissions/management/[id]/interview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AdmissionApplication } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const application = await serverApiFetch<AdmissionApplication>(
    `/admissions/applications/${params.id}/interview`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  if (application === null) {
    return NextResponse.json({ message: 'No se pudo registrar la entrevista' }, { status: 400 });
  }
  return NextResponse.json(application);
}
```

```ts
// apps/web/src/app/api/admissions/management/[id]/accept/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AdmissionAcceptResponse } from '@eduapp/shared-types';

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await serverApiFetch<AdmissionAcceptResponse>(
    `/admissions/applications/${params.id}/accept`,
    { method: 'PATCH' },
  );
  if (result === null) {
    return NextResponse.json({ message: 'No se pudo aceptar la solicitud' }, { status: 400 });
  }
  return NextResponse.json(result);
}
```

```ts
// apps/web/src/app/api/admissions/management/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AdmissionApplication } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const application = await serverApiFetch<AdmissionApplication>(
    `/admissions/applications/${params.id}/reject`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  if (application === null) {
    return NextResponse.json({ message: 'No se pudo rechazar la solicitud' }, { status: 400 });
  }
  return NextResponse.json(application);
}
```

```ts
// apps/web/src/app/api/admissions/management/[id]/link-enrollment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AdmissionApplication } from '@eduapp/shared-types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const application = await serverApiFetch<AdmissionApplication>(
    `/admissions/applications/${params.id}/link-enrollment`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  if (application === null) {
    return NextResponse.json({ message: 'No se pudo enlazar la matrícula' }, { status: 400 });
  }
  return NextResponse.json(application);
}
```

- [ ] **Step 5: Hooks de React Query**

```ts
// apps/web/src/features/admissions/use-admissions.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdmissionAcceptResponse,
  AdmissionApplication,
  AdmissionStatus,
  AdmissionStatusResponse,
  DocumentType,
} from '@eduapp/shared-types';

export interface CreateAdmissionApplicationInput {
  studentFirstName: string;
  studentLastName: string;
  studentBirthDate: string;
  studentDocumentType: DocumentType;
  studentDocumentNumber: string;
  studentAddress: string;
  gradeId: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
}

export interface CreateAdmissionApplicationResult {
  trackingCode: string;
  checkoutUrl: string;
}

async function createAdmissionApplication(
  input: CreateAdmissionApplicationInput,
): Promise<CreateAdmissionApplicationResult> {
  const res = await fetch('/api/admissions/applications', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo enviar la solicitud');
  }
  return res.json();
}

export function useCreateAdmissionApplication() {
  return useMutation({ mutationFn: createAdmissionApplication });
}

async function fetchAdmissionStatus(trackingCode: string): Promise<AdmissionStatusResponse> {
  const res = await fetch(`/api/admissions/applications/status/${encodeURIComponent(trackingCode)}`);
  if (!res.ok) throw new Error('No se encontró una solicitud con ese código');
  return res.json();
}

export function useAdmissionStatus(trackingCode: string) {
  return useQuery({
    queryKey: ['admission-status', trackingCode],
    queryFn: () => fetchAdmissionStatus(trackingCode),
    enabled: trackingCode.trim().length > 0,
    retry: false,
  });
}

async function fetchAdmissionApplications(status?: AdmissionStatus): Promise<AdmissionApplication[]> {
  const url = status
    ? `/api/admissions/management?status=${encodeURIComponent(status)}`
    : '/api/admissions/management';
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudieron cargar las solicitudes');
  return res.json();
}

export function useAdmissionApplications(status?: AdmissionStatus) {
  return useQuery({
    queryKey: ['admission-applications', status ?? 'all'],
    queryFn: () => fetchAdmissionApplications(status),
  });
}

export interface RecordAdmissionInterviewInput {
  id: string;
  interviewDate: string;
  interviewNotes?: string;
}

async function recordAdmissionInterview({
  id,
  ...body
}: RecordAdmissionInterviewInput): Promise<AdmissionApplication> {
  const res = await fetch(`/api/admissions/management/${id}/interview`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body2 = await res.json().catch(() => null);
    throw new Error(body2?.message ?? 'No se pudo registrar la entrevista');
  }
  return res.json();
}

export function useRecordAdmissionInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordAdmissionInterview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admission-applications'] }),
  });
}

async function acceptAdmissionApplication(id: string): Promise<AdmissionAcceptResponse> {
  const res = await fetch(`/api/admissions/management/${id}/accept`, { method: 'PATCH' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo aceptar la solicitud');
  }
  return res.json();
}

export function useAcceptAdmissionApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptAdmissionApplication,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admission-applications'] }),
  });
}

async function rejectAdmissionApplication({
  id,
  rejectionReason,
}: {
  id: string;
  rejectionReason: string;
}): Promise<AdmissionApplication> {
  const res = await fetch(`/api/admissions/management/${id}/reject`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rejectionReason }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo rechazar la solicitud');
  }
  return res.json();
}

export function useRejectAdmissionApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectAdmissionApplication,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admission-applications'] }),
  });
}

async function linkAdmissionEnrollment({
  id,
  enrollmentId,
}: {
  id: string;
  enrollmentId: string;
}): Promise<AdmissionApplication> {
  const res = await fetch(`/api/admissions/management/${id}/link-enrollment`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enrollmentId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo enlazar la matrícula');
  }
  return res.json();
}

export function useLinkAdmissionEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: linkAdmissionEnrollment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admission-applications'] }),
  });
}
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: sin errores. Si `DocumentType` no estaba en `shared-types` (Step 1), este es el punto donde aparecería el error — resolverlo ahí antes de seguir.

- [ ] **Step 7: Commit**

```bash
git add packages/shared-types apps/web/src/features/admissions apps/web/src/app/api/admissions
git commit -m "feat(admissions): agrega tipos compartidos, hooks, y rutas BFF"
```

---

## Task 12: Frontend — páginas públicas (solicitar + estado)

**Files:**
- Create: `apps/web/src/app/(public)/admisiones/solicitar/page.tsx`
- Create: `apps/web/src/app/(public)/admisiones/solicitar/admission-application-form.tsx`
- Create: `apps/web/src/app/(public)/admisiones/estado/page.tsx`
- Create: `apps/web/src/app/(public)/admisiones/estado/admission-status-lookup.tsx`

**Interfaces:**
- Consumes: `useCreateAdmissionApplication`, `useAdmissionStatus` (Task 11); `useGrades` (`apps/web/src/features/academic/use-grades.ts`, ya existe — pero esa ruta (`/api/academic/grades`) requiere sesión vía `serverApiFetch`. Para un formulario público sin login hace falta una ruta pública nueva.

Nota importante: `GET /academic/grades` en el backend **no** tiene `@Public()` ni `@CheckPolicies` — está detrás del `JwtAuthGuard` global igual que cualquier ruta sin `@Public()` (revisar `apps/api/src/modules/academic/interface/controllers/grades.controller.ts` — el método `list()` no tiene `@CheckPolicies`, lo cual solo lo abre a *cualquier usuario autenticado*, no a público). El formulario de solicitud necesita mostrar la lista de grados **sin sesión**. Este task agrega ese único hueco necesario.

- [ ] **Step 1: Exponer `GET /academic/grades` como público**

En `apps/api/src/modules/academic/interface/controllers/grades.controller.ts`, agregar `@Public()` al método `list()` (importar `Public` desde `'../../../../core/auth/casl/../public.decorator'` — la misma ruta relativa que usa `TenantPublicController`: `'../../auth/public.decorator'` ajustada a la profundidad de este archivo, que es `apps/api/src/modules/academic/interface/controllers/grades.controller.ts` → `../../../../core/auth/public.decorator`):

```ts
import { Public } from '../../../../core/auth/public.decorator';
```

y decorar el método:

```ts
@Get()
@Public()
async list() {
  return this.listGrades.execute();
}
```

Esto es seguro: `Grade` (nombre/nivel/orden) no es información sensible, y ya era de lectura abierta a cualquier usuario autenticado — ahora también a público.

Run: `cd apps/api && npx jest src/modules/academic 2>&1 | tail -20`
Expected: sin regresiones (no hay test que dependa de que esta ruta requiera auth).

- [ ] **Step 2: Ruta BFF pública para grados**

```ts
// apps/web/src/app/api/public/grades/route.ts
import { NextResponse } from 'next/server';
import type { Grade } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET() {
  const res = await fetch(`${API_URL}/academic/grades`, {
    headers: { 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json([], { status: 200 });
  return NextResponse.json((await res.json()) as Grade[]);
}
```

- [ ] **Step 3: Página de solicitud (server component, sin auth)**

```tsx
// apps/web/src/app/(public)/admisiones/solicitar/page.tsx
import { AdmissionApplicationForm } from './admission-application-form';

export default function AdmissionApplyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6 rounded-lg border border-border p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Solicitud de admisión</h1>
          <p className="text-sm text-muted-foreground">
            Completá los datos del aspirante. Al enviar, te vamos a redirigir a la pasarela de pago de
            la cuota de solicitud.
          </p>
        </div>
        <AdmissionApplicationForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Formulario de solicitud (client component)**

```tsx
// apps/web/src/app/(public)/admisiones/solicitar/admission-application-form.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useCreateAdmissionApplication } from '@/features/admissions/use-admissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { DocumentType, Grade } from '@eduapp/shared-types';

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'RC', label: 'Registro Civil' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
];

const today = new Date().toISOString().slice(0, 10);

export function AdmissionApplicationForm() {
  const createApplication = useCreateAdmissionApplication();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentLastName, setStudentLastName] = useState('');
  const [studentBirthDate, setStudentBirthDate] = useState('');
  const [studentDocumentType, setStudentDocumentType] = useState<DocumentType | ''>('');
  const [studentDocumentNumber, setStudentDocumentNumber] = useState('');
  const [studentAddress, setStudentAddress] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  useEffect(() => {
    fetch('/api/public/grades')
      .then((res) => res.json())
      .then(setGrades)
      .catch(() => setGrades([]));
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!studentDocumentType || !gradeId) return;
    createApplication.mutate(
      {
        studentFirstName,
        studentLastName,
        studentBirthDate,
        studentDocumentType,
        studentDocumentNumber,
        studentAddress,
        gradeId,
        guardianName,
        guardianEmail,
        guardianPhone,
      },
      {
        onSuccess: ({ checkoutUrl }) => {
          window.location.href = checkoutUrl;
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm font-medium">Datos del aspirante</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="studentFirstName">Nombre</Label>
          <Input
            id="studentFirstName"
            required
            value={studentFirstName}
            onChange={(e) => setStudentFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="studentLastName">Apellido</Label>
          <Input
            id="studentLastName"
            required
            value={studentLastName}
            onChange={(e) => setStudentLastName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="studentBirthDate">Fecha de nacimiento</Label>
          <Input
            id="studentBirthDate"
            type="date"
            required
            max={today}
            value={studentBirthDate}
            onChange={(e) => setStudentBirthDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gradeId">Grado al que aspira</Label>
          <select
            id="gradeId"
            required
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
            className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Seleccioná un grado
            </option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="studentDocumentType">Tipo de documento</Label>
          <select
            id="studentDocumentType"
            required
            value={studentDocumentType}
            onChange={(e) => setStudentDocumentType(e.target.value as DocumentType)}
            className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Seleccioná un tipo
            </option>
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="studentDocumentNumber">Número de documento</Label>
          <Input
            id="studentDocumentNumber"
            required
            minLength={3}
            value={studentDocumentNumber}
            onChange={(e) => setStudentDocumentNumber(e.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="studentAddress">Dirección</Label>
          <Input
            id="studentAddress"
            required
            minLength={3}
            value={studentAddress}
            onChange={(e) => setStudentAddress(e.target.value)}
          />
        </div>
      </div>

      <p className="text-sm font-medium">Datos de contacto (acudiente)</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="guardianName">Nombre completo</Label>
          <Input
            id="guardianName"
            required
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guardianEmail">Email</Label>
          <Input
            id="guardianEmail"
            type="email"
            required
            value={guardianEmail}
            onChange={(e) => setGuardianEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guardianPhone">Teléfono</Label>
          <Input
            id="guardianPhone"
            required
            minLength={7}
            value={guardianPhone}
            onChange={(e) => setGuardianPhone(e.target.value)}
          />
        </div>
      </div>

      {createApplication.isError && (
        <p className="text-sm text-destructive">{createApplication.error.message}</p>
      )}

      <Button type="submit" disabled={createApplication.isPending} className="w-full">
        {createApplication.isPending && <Spinner className="mr-2 h-4 w-4" />}
        {createApplication.isPending ? 'Enviando...' : 'Enviar solicitud y pagar'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Página de consulta de estado**

```tsx
// apps/web/src/app/(public)/admisiones/estado/page.tsx
import { AdmissionStatusLookup } from './admission-status-lookup';

export default function AdmissionStatusPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Consultar solicitud</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá el código de seguimiento que recibiste al enviar tu solicitud.
          </p>
        </div>
        <AdmissionStatusLookup />
      </div>
    </main>
  );
}
```

```tsx
// apps/web/src/app/(public)/admisiones/estado/admission-status-lookup.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useAdmissionStatus } from '@/features/admissions/use-admissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: 'Pendiente de pago',
  pendiente_entrevista: 'Pendiente de entrevista',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
};

export function AdmissionStatusLookup() {
  const [code, setCode] = useState('');
  const [submittedCode, setSubmittedCode] = useState('');
  const { data, isLoading, isError } = useAdmissionStatus(submittedCode);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmittedCode(code.trim());
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="code">Código de seguimiento</Label>
          <Input
            id="code"
            placeholder="SOL-A8F3K2"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          {isLoading ? 'Buscando...' : 'Consultar'}
        </Button>
      </form>

      {isError && <p className="text-sm text-destructive">No se encontró una solicitud con ese código.</p>}

      {data && (
        <div className="rounded border border-border p-4 text-sm">
          <p>
            <span className="text-muted-foreground">Grado:</span> {data.gradeName}
          </p>
          <p>
            <span className="text-muted-foreground">Estado:</span>{' '}
            {STATUS_LABELS[data.status] ?? data.status}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Typecheck y verificación manual**

Run: `cd apps/web && npx tsc --noEmit`
Expected: sin errores.

Con el server de web y api corriendo, abrir `http://localhost:3000/admisiones/solicitar` (sin haber iniciado sesión) — debe mostrar el formulario con el select de grados poblado. Completarlo y enviarlo: si hay un `FeeSchedule` de `solicitud_admision` configurado para ese grado, debe redirigir a la URL de checkout de MercadoPago.

Copiar el `trackingCode` devuelto (verlo en la Network tab del navegador si el redirect a MercadoPago falla en dev por falta de credenciales reales — el `trackingCode` ya se generó igual) y probarlo en `http://localhost:3000/admisiones/estado`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/academic/interface/controllers/grades.controller.ts \
        apps/web/src/app/api/public apps/web/src/app/\(public\)
git commit -m "feat(admissions): agrega páginas públicas de solicitud y consulta de estado"
```

---

## Task 13: Frontend — panel de staff + enlace con Matrícula

**Files:**
- Create: `apps/web/src/app/(dashboard)/admissions/page.tsx`
- Create: `apps/web/src/features/admissions/components/admission-applications-list.tsx`
- Modify: `apps/web/src/features/enrollment/components/enroll-student-form.tsx` (soportar pre-carga desde una solicitud aceptada)
- Modify: `apps/web/src/app/(dashboard)/enrollment/page.tsx` (leer `?admissionId=` de la URL)

**Interfaces:**
- Consumes: `useAdmissionApplications`, `useRecordAdmissionInterview`, `useAcceptAdmissionApplication`, `useRejectAdmissionApplication`, `useLinkAdmissionEnrollment` (Task 11); `canManageAdmissions` (Task 10); `EnrollStudentForm` existente (Task del trabajo previo de Matrícula).

- [ ] **Step 1: Página del panel de staff**

```tsx
// apps/web/src/app/(dashboard)/admissions/page.tsx
import { AdmissionApplicationsList } from '@/features/admissions/components/admission-applications-list';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAdmissions } from '@/lib/permissions';
import { redirect } from 'next/navigation';

export default async function AdmissionsPage() {
  const user = await getCurrentUser();
  if (!canManageAdmissions(user?.roles ?? [])) redirect('/dashboard');

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          Solicitudes de admisión: pago, entrevista, y aceptación/rechazo.
        </p>
      </div>
      <AdmissionApplicationsList />
    </main>
  );
}
```

- [ ] **Step 2: Lista de solicitudes con acciones**

```tsx
// apps/web/src/features/admissions/components/admission-applications-list.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  useAdmissionApplications,
  useRecordAdmissionInterview,
  useAcceptAdmissionApplication,
  useRejectAdmissionApplication,
} from '../use-admissions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: 'Pendiente de pago',
  pendiente_entrevista: 'Pendiente de entrevista',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
};

export function AdmissionApplicationsList() {
  const router = useRouter();
  const { data: applications, isLoading, error } = useAdmissionApplications();
  const recordInterview = useRecordAdmissionInterview();
  const acceptApplication = useAcceptAdmissionApplication();
  const rejectApplication = useRejectAdmissionApplication();

  const [interviewingId, setInterviewingId] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las solicitudes.</p>;
  if (!applications || applications.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay solicitudes.</p>;
  }

  function saveInterview(id: string) {
    if (!interviewDate) return;
    recordInterview.mutate(
      { id, interviewDate, interviewNotes: interviewNotes || undefined },
      { onSuccess: () => setInterviewingId(null) },
    );
  }

  async function handleAccept(id: string) {
    const result = await acceptApplication.mutateAsync(id);
    // El estudiante nuevo/de regreso se termina de matricular desde la
    // página de Matrícula, pre-cargada con los datos de esta solicitud —
    // se pasan todos los campos de `prefill` por query param porque la
    // navegación cruza de un client component a una Server Component page.
    const params = new URLSearchParams({ admissionId: id, ...result.prefill });
    if (result.matchedUserId) params.set('matchedUserId', result.matchedUserId);
    router.push(`/enrollment?${params.toString()}`);
  }

  function saveReject(id: string) {
    if (!rejectionReason.trim()) return;
    rejectApplication.mutate({ id, rejectionReason }, { onSuccess: () => setRejectingId(null) });
  }

  return (
    <ul className="space-y-2">
      {applications.map((application) => (
        <Card key={application.id} className="space-y-2 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {application.studentFirstName} {application.studentLastName}
              </p>
              <p className="text-xs text-muted-foreground">{application.trackingCode}</p>
            </div>
            <span className="text-xs uppercase text-muted-foreground">
              {STATUS_LABELS[application.status] ?? application.status}
            </span>
          </div>

          {application.status === 'pendiente_entrevista' && (
            <div className="flex flex-wrap items-center gap-2">
              {interviewingId === application.id ? (
                <>
                  <Input
                    type="datetime-local"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-48"
                  />
                  <Input
                    placeholder="Notas (opcional)"
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                    className="w-56"
                  />
                  <Button type="button" onClick={() => saveInterview(application.id)}>
                    Guardar entrevista
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setInterviewingId(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setInterviewingId(application.id);
                    setInterviewDate(application.interviewDate?.slice(0, 16) ?? '');
                    setInterviewNotes(application.interviewNotes ?? '');
                  }}
                >
                  {application.interviewDate ? 'Editar entrevista' : 'Registrar entrevista'}
                </Button>
              )}

              {rejectingId === application.id ? (
                <>
                  <Input
                    placeholder="Motivo del rechazo"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-56"
                  />
                  <Button type="button" variant="ghost" onClick={() => saveReject(application.id)}>
                    Confirmar rechazo
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setRejectingId(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setRejectingId(application.id)}>
                  Rechazar
                </Button>
              )}

              <Button type="button" onClick={() => handleAccept(application.id)}>
                Aceptar
              </Button>
            </div>
          )}

          {application.status === 'rechazada' && application.rejectionReason && (
            <p className="text-sm text-muted-foreground">Motivo: {application.rejectionReason}</p>
          )}
        </Card>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Pre-carga en Matrícula desde una solicitud aceptada**

En `apps/web/src/app/(dashboard)/enrollment/page.tsx`, leer los query params (el shape exacto de `prefill` que devuelve `AcceptAdmissionApplicationUseCase`, Task 9) y pasarlos a `EnrollStudentForm`:

```tsx
// apps/web/src/app/(dashboard)/enrollment/page.tsx
import { EnrollmentsList } from '@/features/enrollment/components/enrollments-list';
import { EnrollStudentForm } from '@/features/enrollment/components/enroll-student-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageEnrollment } from '@/lib/permissions';
import type { DocumentType } from '@eduapp/shared-types';

export default async function EnrollmentPage({
  searchParams,
}: {
  searchParams: {
    admissionId?: string;
    matchedUserId?: string;
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    documentType?: string;
    documentNumber?: string;
    address?: string;
    gradeId?: string;
    academicYearId?: string;
  };
}) {
  const user = await getCurrentUser();
  const canManage = canManageEnrollment(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          Inscripción de estudiantes en secciones por año lectivo.
        </p>
      </div>

      {canManage && (
        <EnrollStudentForm
          admissionId={searchParams.admissionId}
          matchedUserId={searchParams.matchedUserId || undefined}
          prefill={
            searchParams.admissionId
              ? {
                  firstName: searchParams.firstName ?? '',
                  lastName: searchParams.lastName ?? '',
                  birthDate: searchParams.birthDate ?? '',
                  documentType: (searchParams.documentType as DocumentType) || '',
                  documentNumber: searchParams.documentNumber ?? '',
                  address: searchParams.address ?? '',
                  academicYearId: searchParams.academicYearId ?? '',
                }
              : undefined
          }
        />
      )}
      <EnrollmentsList canManage={canManage} />
    </main>
  );
}
```

- [ ] **Step 4: `EnrollStudentForm` acepta el prefill y enlaza la matrícula al aceptar**

Modificar `apps/web/src/features/enrollment/components/enroll-student-form.tsx`:

1. Cambiar la firma del componente para aceptar props opcionales:

```tsx
interface AdmissionPrefill {
  firstName: string;
  lastName: string;
  birthDate: string;
  documentType: DocumentType | '';
  documentNumber: string;
  address: string;
  academicYearId: string;
}

export function EnrollStudentForm({
  admissionId,
  matchedUserId,
  prefill,
}: {
  admissionId?: string;
  matchedUserId?: string;
  prefill?: AdmissionPrefill;
}) {
```

2. Importar `useLinkAdmissionEnrollment` (no se vuelve a llamar a `accept` acá — ya se aceptó desde el panel de Admisiones, Task 13 Step 2):

```tsx
import { useLinkAdmissionEnrollment } from '@/features/admissions/use-admissions';
```

y en el cuerpo del componente:

```tsx
const linkEnrollment = useLinkAdmissionEnrollment();
```

3. Cambiar la inicialización de los `useState` de los campos que `prefill` puede completar, para que arranquen ya cargados (no un `useEffect` — el valor solo importa en el primer render de esta página, que siempre es una carga fresca vía navegación desde el panel de Admisiones):

```tsx
const [mode, setMode] = useState<StudentMode>(matchedUserId ? 'existing' : prefill ? 'new' : 'existing');
const [dialogOpen, setDialogOpen] = useState(!matchedUserId && !!prefill);
const [studentId, setStudentId] = useState(matchedUserId ?? '');
const [firstName, setFirstName] = useState(prefill?.firstName ?? '');
const [lastName, setLastName] = useState(prefill?.lastName ?? '');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [birthDate, setBirthDate] = useState(prefill?.birthDate ?? '');
const [documentType, setDocumentType] = useState<DocumentType | ''>(prefill?.documentType ?? '');
const [documentNumber, setDocumentNumber] = useState(prefill?.documentNumber ?? '');
const [address, setAddress] = useState(prefill?.address ?? '');
const [academicYearId, setAcademicYearId] = useState(prefill?.academicYearId ?? '');
const [sectionId, setSectionId] = useState('');
const [error, setError] = useState<string | null>(null);
```

Nota: `email` y `password` **no** vienen de `prefill` a propósito (ver "Refinamientos sobre el spec original" al inicio de este plan) — secretaría los define acá, es el único dato que sí se tipea de cero.

4. En `handleSubmitExisting`, después de `await enrollStudent.mutateAsync(...)`, si hay `admissionId`, enlazarlo:

```tsx
async function handleSubmitExisting(event: FormEvent) {
  event.preventDefault();
  if (!studentId || !academicYearId || !sectionId) return;
  setError(null);
  try {
    const enrollment = await enrollStudent.mutateAsync({ studentId, sectionId, academicYearId });
    if (admissionId) {
      await linkEnrollment.mutateAsync({ id: admissionId, enrollmentId: enrollment.id });
    }
    setStudentId('');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'No se pudo matricular al estudiante');
  }
}
```

5. Igual en `handleSubmitNew`, después de `await enrollStudent.mutateAsync(...)`:

```tsx
async function handleSubmitNew(event: FormEvent) {
  event.preventDefault();
  if (!academicYearId || !sectionId || !documentType) return;
  setError(null);

  try {
    const created = await createUser.mutateAsync({
      email, password, firstName, lastName, roles: ['estudiante'],
      birthDate, documentType, documentNumber, address,
    });

    const enrollment = await enrollStudent.mutateAsync({ studentId: created.id, sectionId, academicYearId });
    if (admissionId) {
      await linkEnrollment.mutateAsync({ id: admissionId, enrollmentId: enrollment.id });
    }
    resetNewStudentFields();
    setDialogOpen(false);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'No se pudo matricular al estudiante');
  }
}
```

- [ ] **Step 5: Typecheck y build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: sin errores.

Run: `cd apps/web && pnpm lint`
Expected: sin errores nuevos (el warning preexistente de fuentes en `layout.tsx` es aceptable, ya estaba antes de este plan).

- [ ] **Step 6: Verificación manual end-to-end**

Con ambos servers corriendo:

1. Configurar un precio: loguearse como admin, ir a Finanzas → Lista de precios, crear un `FeeSchedule` con concepto "Solicitud de admisión" para un grado y el año activo.
2. Ir a `/admisiones/solicitar` (sin sesión), completar el formulario con un documento que **no** exista todavía como usuario, enviarlo.
3. Copiar el `trackingCode` de la respuesta (Network tab) y simular el pago confirmado llamando directamente al webhook (ya que MercadoPago sandbox no está configurado en dev):

```bash
docker exec eduapp-postgres-1 psql -U eduapp -d eduapp -c \
  "UPDATE tenant_colegio_demo.admission_applications SET status='pendiente_entrevista', paid_at=now() WHERE tracking_code='<CODIGO>';"
```

(Actualización directa en base — sustituye la llamada real al webhook/MercadoPago en este ambiente de dev sin credenciales reales; documentar esto explícitamente como la forma de probarlo acá, no como el flujo de producción.)

4. Loguearse como admin, ir a `/admissions`, ver la solicitud en "Pendiente de entrevista".
5. Registrar una entrevista (fecha + notas).
6. Aceptar la solicitud → debe redirigir a `/enrollment?admissionId=...` con el modal de "Estudiante nuevo" abierto.
7. Completar el modal y confirmar → verificar que la matrícula se creó Y que `admission_applications.resulting_enrollment_id` quedó completado:

```bash
docker exec eduapp-postgres-1 psql -U eduapp -d eduapp -c \
  "SELECT status, resulting_enrollment_id FROM tenant_colegio_demo.admission_applications WHERE tracking_code='<CODIGO>';"
```

Expected: `status = 'aceptada'`, `resulting_enrollment_id` no nulo.

8. Repetir el flujo completo con un número de documento que **sí** coincida con un usuario existente (por ejemplo uno ya matriculado y retirado) — al aceptar, debe redirigir a `/enrollment?admissionId=...&matchedUserId=...` con el modo "Estudiante existente" y ese estudiante preseleccionado.
9. Consultar `/admisiones/estado` con el `trackingCode` de cualquiera de los dos casos y confirmar que el estado mostrado es el correcto y no expone datos personales.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/admissions apps/web/src/features/admissions \
        apps/web/src/features/enrollment/components/enroll-student-form.tsx \
        apps/web/src/app/\(dashboard\)/enrollment/page.tsx
git commit -m "feat(admissions): agrega panel de staff y enlace con el flujo de matrícula"
```
