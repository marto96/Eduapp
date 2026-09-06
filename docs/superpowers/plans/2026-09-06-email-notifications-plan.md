# Notificaciones por correo (admisión, pagos, recordatorio de pensión) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar correo electrónico en 5 momentos del flujo de admisión (solicitud recibida, pago aprobado/rechazado, solicitud aceptada/rechazada) y un recordatorio diario cuando una pensión pasa su fecha de plazo, con plantillas editables por cada colegio (tenant).

**Architecture:** Módulo hexagonal nuevo `EmailModule` (puerto `EmailPort` + adaptador Resend, mismo patrón que `PaymentGatewayPort`/Wompi). Plantillas (`EmailTemplate`) viven en el schema de cada tenant, con un texto por defecto en código como fallback. Los 5 disparadores de admisión se agregan a use-cases ya existentes. El recordatorio de pensión es un `@Cron` diario (`@nestjs/schedule`) que itera todos los tenants construyendo repositorios manualmente con la `DataSource` de cada schema (mismo criterio que `run-migrations-all-tenants.ts`), evitando el problema de usar providers `Scope.REQUEST` fuera de un request HTTP real.

**Tech Stack:** NestJS (hexagonal), TypeORM (migraciones raw SQL), `resend` (SDK oficial), `@nestjs/schedule`, Next.js App Router + TanStack Query en el frontend.

**Spec:** `docs/superpowers/specs/2026-09-06-email-notifications-design.md`

## Global Constraints

- Hexagonal: puertos (`abstract class ...Port`) en `application/ports/`, implementaciones en `infrastructure/`. Los use-cases dependen solo del puerto.
- Repositorios tenant-scoped inyectan `@Inject(TENANT_DATA_SOURCE) dataSource: DataSource` (nunca `@InjectRepository` de conexión global) — ver `typeorm-grade-weight-config.repository.ts` como referencia exacta.
- Migraciones en `src/core/database/migrations/tenant/<timestamp>-<Nombre>.ts`, siguiente número disponible: `1700000000060`. `up`/`down` con SQL crudo vía `queryRunner.query(...)`.
- Patrón "mejor esfuerzo": cualquier envío de correo debe estar en `try/catch` con `Logger.warn` en el catch — nunca debe propagar la excepción hacia el flujo que lo disparó (mismo criterio que `notify-new-grade.service.ts`).
- CASL: agregar subjects nuevos al union `AppSubjects` en `src/core/auth/casl/ability.ts`, y otorgarlos en `src/core/auth/casl/ability.factory.ts`.
- Variables de entorno nuevas se agregan al schema Joi en `src/core/config/env.validation.ts` y se documentan en `.env.example`.
- **IMPORTANTE — colisión de nombres:** `@nestjs/schedule` exporta una clase `ScheduleModule`, y `src/app.module.ts` ya importa OTRA clase distinta con el mismo nombre desde `./modules/schedule/schedule.module` (el módulo de horarios de clase). Al importar el de `@nestjs/schedule` en `app.module.ts`, se debe usar un alias: `import { ScheduleModule as CronScheduleModule } from '@nestjs/schedule';`.
- Frontend: proxy de API route en `apps/web/src/app/api/...` usando `serverApiFetch` + hook TanStack Query en `apps/web/src/features/...`, mismo patrón que `use-grade-weight-config.ts` / `apps/web/src/app/api/grading/weight-config/route.ts`.

---

### Task 1: `EmailPort` + adaptador Resend + `EmailModule`

**Files:**
- Create: `apps/api/src/modules/email/application/ports/email.port.ts`
- Create: `apps/api/src/modules/email/infrastructure/email/resend-email-gateway.ts`
- Create: `apps/api/src/modules/email/infrastructure/email/resend-email-gateway.spec.ts`
- Create: `apps/api/src/modules/email/email.module.ts`
- Modify: `apps/api/src/core/config/env.validation.ts`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/package.json` (dependencia `resend`)

**Interfaces:**
- Produces: `EmailPort` (clase abstracta, `send(input: SendEmailInput): Promise<void>`) — usado por `SendTemplatedEmailUseCase` (Task 4).

- [ ] **Step 1: Instalar el SDK de Resend**

```bash
cd apps/api && pnpm add resend
```

- [ ] **Step 2: Crear el puerto**

`apps/api/src/modules/email/application/ports/email.port.ts`:

```ts
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Abstrae el proveedor de correo transaccional (hoy Resend). Mismo criterio
 * que `PaymentGatewayPort` para el gateway de pago: el resto del sistema
 * nunca conoce el SDK concreto.
 */
export abstract class EmailPort {
  abstract send(input: SendEmailInput): Promise<void>;
}
```

- [ ] **Step 3: Escribir el test del adaptador (falla primero)**

`apps/api/src/modules/email/infrastructure/email/resend-email-gateway.spec.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import { ResendEmailGateway } from './resend-email-gateway';

const sendMock = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

describe('ResendEmailGateway', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'RESEND_API_KEY') return 're_test_000';
      if (key === 'RESEND_FROM_ADDRESS') return 'no-reply@eduapp.test';
      return undefined;
    }),
  } as unknown as ConfigService;

  beforeEach(() => jest.clearAllMocks());

  it('envía el correo con los datos del input y el remitente configurado', async () => {
    sendMock.mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const gateway = new ResendEmailGateway(config);

    await gateway.send({ to: 'guardian@test.com', subject: 'Hola', html: '<p>Hola</p>' });

    expect(sendMock).toHaveBeenCalledWith({
      from: 'no-reply@eduapp.test',
      to: 'guardian@test.com',
      subject: 'Hola',
      html: '<p>Hola</p>',
    });
  });

  it('propaga un error si Resend responde con error', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'Dominio no verificado' } });
    const gateway = new ResendEmailGateway(config);

    await expect(
      gateway.send({ to: 'guardian@test.com', subject: 'Hola', html: '<p>Hola</p>' }),
    ).rejects.toThrow('Dominio no verificado');
  });
});
```

- [ ] **Step 4: Correr el test para verificar que falla**

Run: `pnpm --filter @eduapp/api test resend-email-gateway`
Expected: FAIL — `Cannot find module './resend-email-gateway'`

- [ ] **Step 5: Implementar el adaptador**

`apps/api/src/modules/email/infrastructure/email/resend-email-gateway.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailPort, SendEmailInput } from '../../application/ports/email.port';

@Injectable()
export class ResendEmailGateway extends EmailPort {
  private readonly client: Resend;
  private readonly fromAddress: string;

  constructor(config: ConfigService) {
    super();
    this.client = new Resend(config.get<string>('RESEND_API_KEY'));
    this.fromAddress = config.get<string>('RESEND_FROM_ADDRESS')!;
  }

  async send(input: SendEmailInput): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.fromAddress,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      throw new Error(error.message);
    }
  }
}
```

- [ ] **Step 6: Correr el test para verificar que pasa**

Run: `pnpm --filter @eduapp/api test resend-email-gateway`
Expected: PASS (2 tests)

- [ ] **Step 7: Agregar las variables de entorno**

En `apps/api/src/core/config/env.validation.ts`, agregar dentro del objeto del schema (después del bloque de Wompi):

```ts
  // API key de Resend (prefijo re_). En dev/test se puede dejar el
  // default — ResendEmailGateway solo se ejecuta si un flujo real intenta
  // enviar un correo, y en test los envíos van mockeados.
  RESEND_API_KEY: Joi.string().default('re_test_0000000000000000000000'),
  RESEND_FROM_ADDRESS: Joi.string().email().default('no-reply@eduapp.test'),
```

En `apps/api/.env.example`, agregar:

```
RESEND_API_KEY=re_test_0000000000000000000000
RESEND_FROM_ADDRESS=no-reply@eduapp.test
```

- [ ] **Step 8: Crear el módulo**

`apps/api/src/modules/email/email.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { EmailPort } from './application/ports/email.port';
import { ResendEmailGateway } from './infrastructure/email/resend-email-gateway';

@Module({
  providers: [{ provide: EmailPort, useClass: ResendEmailGateway }],
  exports: [EmailPort],
})
export class EmailModule {}
```

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/email apps/api/src/core/config/env.validation.ts apps/api/.env.example apps/api/package.json apps/api/pnpm-lock.yaml
git commit -m "feat(email): agregar EmailPort y adaptador Resend"
```

---

### Task 2: Entidad `EmailTemplate` + migración + repositorio

**Files:**
- Create: `apps/api/src/modules/email/domain/entities/email-template.entity.ts`
- Create: `apps/api/src/core/database/migrations/tenant/1700000000060-CreateEmailTemplates.ts`
- Create: `apps/api/src/modules/email/application/ports/email-template.repository.port.ts`
- Create: `apps/api/src/modules/email/infrastructure/entities/email-template.orm-entity.ts`
- Create: `apps/api/src/modules/email/infrastructure/repositories/typeorm-email-template.repository.ts`
- Create: `apps/api/src/modules/email/infrastructure/repositories/typeorm-email-template.repository.spec.ts`

**Interfaces:**
- Consumes: `TENANT_DATA_SOURCE` (`apps/api/src/core/database/tenant-datasource.provider.ts`).
- Produces: `EmailTemplateRepositoryPort` (`findByType`, `save`) — usado por `EmailTemplateService` (Task 3) y los use-cases de CRUD (Task 5).

- [ ] **Step 1: Entidad de dominio**

`apps/api/src/modules/email/domain/entities/email-template.entity.ts`:

```ts
export type EmailTemplateType =
  | 'solicitud_recibida'
  | 'pago_aprobado'
  | 'pago_rechazado'
  | 'solicitud_aceptada'
  | 'solicitud_rechazada'
  | 'recordatorio_pension';

export class EmailTemplate {
  constructor(
    public readonly id: string,
    public readonly type: EmailTemplateType,
    public subject: string,
    public body: string,
    public updatedAt: string,
  ) {}

  edit(subject: string, body: string): void {
    this.subject = subject;
    this.body = body;
    this.updatedAt = new Date().toISOString();
  }
}
```

- [ ] **Step 2: Migración**

`apps/api/src/core/database/migrations/tenant/1700000000060-CreateEmailTemplates.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Una fila por tipo de correo, solo si el colegio lo personalizó — si no
 * existe fila para un `type`, `EmailTemplateService` usa el default
 * hardcodeado en código (ver default-email-templates.ts).
 */
export class CreateEmailTemplates1700000000060 implements MigrationInterface {
  name = 'CreateEmailTemplates1700000000060';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "email_templates" (
        "id" uuid PRIMARY KEY,
        "type" varchar(40) NOT NULL UNIQUE,
        "subject" varchar(255) NOT NULL,
        "body" text NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_templates"`);
  }
}
```

- [ ] **Step 3: Puerto**

`apps/api/src/modules/email/application/ports/email-template.repository.port.ts`:

```ts
import { EmailTemplate, EmailTemplateType } from '../../domain/entities/email-template.entity';

export abstract class EmailTemplateRepositoryPort {
  abstract findByType(type: EmailTemplateType): Promise<EmailTemplate | null>;
  abstract findAll(): Promise<EmailTemplate[]>;
  abstract save(template: EmailTemplate): Promise<void>;
}
```

- [ ] **Step 4: Entidad ORM**

`apps/api/src/modules/email/infrastructure/entities/email-template.orm-entity.ts`:

```ts
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { EmailTemplateType } from '../../domain/entities/email-template.entity';

@Entity({ name: 'email_templates' })
export class EmailTemplateOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  type: EmailTemplateType;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

- [ ] **Step 5: Escribir el test del repositorio (falla primero)**

`apps/api/src/modules/email/infrastructure/repositories/typeorm-email-template.repository.spec.ts`:

```ts
import { DataSource } from 'typeorm';
import { TypeOrmEmailTemplateRepository } from './typeorm-email-template.repository';
import { EmailTemplate } from '../../domain/entities/email-template.entity';
import { EmailTemplateOrmEntity } from '../entities/email-template.orm-entity';

describe('TypeOrmEmailTemplateRepository', () => {
  let dataSource: DataSource;
  let repo: TypeOrmEmailTemplateRepository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [EmailTemplateOrmEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    repo = new TypeOrmEmailTemplateRepository(dataSource);
  });

  afterAll(() => dataSource.destroy());

  it('guarda y busca una plantilla por tipo', async () => {
    const template = new EmailTemplate('t-1', 'solicitud_recibida', 'Asunto', '<p>Cuerpo</p>', new Date().toISOString());
    await repo.save(template);

    const found = await repo.findByType('solicitud_recibida');
    expect(found?.subject).toBe('Asunto');
  });

  it('devuelve null si no existe plantilla para ese tipo', async () => {
    const found = await repo.findByType('pago_aprobado');
    expect(found).toBeNull();
  });

  it('lista todas las plantillas guardadas', async () => {
    const all = await repo.findAll();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 6: Correr el test para verificar que falla**

Run: `pnpm --filter @eduapp/api test typeorm-email-template.repository`
Expected: FAIL — `Cannot find module './typeorm-email-template.repository'`

- [ ] **Step 7: Implementar el repositorio**

`apps/api/src/modules/email/infrastructure/repositories/typeorm-email-template.repository.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EmailTemplateRepositoryPort } from '../../application/ports/email-template.repository.port';
import { EmailTemplate, EmailTemplateType } from '../../domain/entities/email-template.entity';
import { EmailTemplateOrmEntity } from '../entities/email-template.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmEmailTemplateRepository extends EmailTemplateRepositoryPort {
  private readonly repo: Repository<EmailTemplateOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(EmailTemplateOrmEntity);
  }

  async findByType(type: EmailTemplateType): Promise<EmailTemplate | null> {
    const row = await this.repo.findOne({ where: { type } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<EmailTemplate[]> {
    const rows = await this.repo.find();
    return rows.map((row) => this.toDomain(row));
  }

  async save(template: EmailTemplate): Promise<void> {
    await this.repo.save({
      id: template.id,
      type: template.type,
      subject: template.subject,
      body: template.body,
      updatedAt: new Date(template.updatedAt),
    });
  }

  private toDomain(row: EmailTemplateOrmEntity): EmailTemplate {
    return new EmailTemplate(
      row.id,
      row.type,
      row.subject,
      row.body,
      row.updatedAt.toISOString(),
    );
  }
}
```

- [ ] **Step 8: Correr el test para verificar que pasa**

Run: `pnpm --filter @eduapp/api test typeorm-email-template.repository`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/email apps/api/src/core/database/migrations/tenant/1700000000060-CreateEmailTemplates.ts
git commit -m "feat(email): agregar entidad, migración y repositorio de EmailTemplate"
```

---

### Task 3: Plantillas por defecto + `EmailTemplateService`

**Files:**
- Create: `apps/api/src/modules/email/application/services/default-email-templates.ts`
- Create: `apps/api/src/modules/email/application/services/email-template.service.ts`
- Create: `apps/api/src/modules/email/application/services/email-template.service.spec.ts`
- Modify: `apps/api/src/modules/email/email.module.ts`

**Interfaces:**
- Consumes: `EmailTemplateRepositoryPort` (Task 2).
- Produces: `EmailTemplateService.render(type, variables): Promise<{subject: string; html: string}>` — usado por `SendTemplatedEmailUseCase` (Task 4).

- [ ] **Step 1: Plantillas por defecto**

`apps/api/src/modules/email/application/services/default-email-templates.ts`:

```ts
import { EmailTemplateType } from '../../domain/entities/email-template.entity';

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, { subject: string; body: string }> = {
  solicitud_recibida: {
    subject: 'Recibimos tu solicitud de admisión — {{trackingCode}}',
    body: '<p>Hola {{guardianName}},</p><p>Recibimos la solicitud de admisión de {{estudiante}} para {{grado}}. Tu código de seguimiento es <strong>{{trackingCode}}</strong>.</p><p>Podés completar el pago acá: <a href="{{checkoutUrl}}">{{checkoutUrl}}</a></p>',
  },
  pago_aprobado: {
    subject: 'Pago confirmado — solicitud {{trackingCode}}',
    body: '<p>Hola {{guardianName}},</p><p>Confirmamos el pago de la solicitud de admisión de {{estudiante}} ({{trackingCode}}).</p>',
  },
  pago_rechazado: {
    subject: 'No pudimos confirmar tu pago — solicitud {{trackingCode}}',
    body: '<p>Hola {{guardianName}},</p><p>El pago de la solicitud de {{estudiante}} ({{trackingCode}}) no pudo confirmarse. Podés intentar de nuevo desde el estado de tu trámite.</p>',
  },
  solicitud_aceptada: {
    subject: '¡Solicitud aceptada! — {{trackingCode}}',
    body: '<p>Hola {{guardianName}},</p><p>La solicitud de admisión de {{estudiante}} fue aceptada. Nos pondremos en contacto para los siguientes pasos.</p>',
  },
  solicitud_rechazada: {
    subject: 'Novedades sobre tu solicitud — {{trackingCode}}',
    body: '<p>Hola {{guardianName}},</p><p>La solicitud de admisión de {{estudiante}} no fue aceptada en esta oportunidad.</p>',
  },
  recordatorio_pension: {
    subject: 'Pensión pendiente de pago — {{estudiante}}',
    body: '<p>Te recordamos que la pensión de {{estudiante}} con vencimiento {{fechaVencimiento}} se encuentra pendiente de pago, por un monto de {{monto}}.</p>',
  },
};
```

- [ ] **Step 2: Escribir el test del servicio (falla primero)**

`apps/api/src/modules/email/application/services/email-template.service.spec.ts`:

```ts
import { EmailTemplateService } from './email-template.service';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { EmailTemplate } from '../../domain/entities/email-template.entity';

describe('EmailTemplateService', () => {
  const templates: jest.Mocked<EmailTemplateRepositoryPort> = {
    findByType: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const service = new EmailTemplateService(templates);

  beforeEach(() => jest.clearAllMocks());

  it('usa la plantilla personalizada del tenant si existe', async () => {
    templates.findByType.mockResolvedValue(
      new EmailTemplate('t-1', 'solicitud_recibida', 'Asunto custom {{estudiante}}', '<p>Hola {{estudiante}}</p>', new Date().toISOString()),
    );

    const result = await service.render('solicitud_recibida', { estudiante: 'Juan' });

    expect(result.subject).toBe('Asunto custom Juan');
    expect(result.html).toBe('<p>Hola Juan</p>');
  });

  it('usa el default en código si el tenant no personalizó ese tipo', async () => {
    templates.findByType.mockResolvedValue(null);

    const result = await service.render('pago_aprobado', {
      trackingCode: 'ABC123',
      guardianName: 'María',
      estudiante: 'Juan',
    });

    expect(result.subject).toBe('Pago confirmado — solicitud ABC123');
    expect(result.html).toContain('María');
  });

  it('deja el placeholder literal si falta una variable', async () => {
    templates.findByType.mockResolvedValue(null);

    const result = await service.render('pago_aprobado', { trackingCode: 'ABC123' });

    expect(result.html).toContain('{{guardianName}}');
  });
});
```

- [ ] **Step 3: Correr el test para verificar que falla**

Run: `pnpm --filter @eduapp/api test email-template.service`
Expected: FAIL — `Cannot find module './email-template.service'`

- [ ] **Step 4: Implementar el servicio**

`apps/api/src/modules/email/application/services/email-template.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { EmailTemplateType } from '../../domain/entities/email-template.entity';
import { DEFAULT_EMAIL_TEMPLATES } from './default-email-templates';

@Injectable()
export class EmailTemplateService {
  constructor(
    @Inject(EmailTemplateRepositoryPort) private readonly templates: EmailTemplateRepositoryPort,
  ) {}

  async render(
    type: EmailTemplateType,
    variables: Record<string, string>,
  ): Promise<{ subject: string; html: string }> {
    const custom = await this.templates.findByType(type);
    const source = custom ?? DEFAULT_EMAIL_TEMPLATES[type];
    const subject = custom ? custom.subject : source.subject;
    const body = custom ? custom.body : source.body;

    return {
      subject: this.interpolate(subject, variables),
      html: this.interpolate(body, variables),
    };
  }

  private interpolate(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match,
    );
  }
}
```

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `pnpm --filter @eduapp/api test email-template.service`
Expected: PASS (3 tests)

- [ ] **Step 6: Registrar en el módulo**

En `apps/api/src/modules/email/email.module.ts`, agregar `EmailTemplateService` y el binding del repositorio:

```ts
import { Module } from '@nestjs/common';
import { EmailPort } from './application/ports/email.port';
import { ResendEmailGateway } from './infrastructure/email/resend-email-gateway';
import { EmailTemplateRepositoryPort } from './application/ports/email-template.repository.port';
import { TypeOrmEmailTemplateRepository } from './infrastructure/repositories/typeorm-email-template.repository';
import { EmailTemplateService } from './application/services/email-template.service';

@Module({
  providers: [
    { provide: EmailPort, useClass: ResendEmailGateway },
    { provide: EmailTemplateRepositoryPort, useClass: TypeOrmEmailTemplateRepository },
    EmailTemplateService,
  ],
  exports: [EmailPort, EmailTemplateRepositoryPort],
})
export class EmailModule {}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/email
git commit -m "feat(email): agregar plantillas por defecto y EmailTemplateService"
```

---

### Task 4: `SendTemplatedEmailUseCase`

**Files:**
- Create: `apps/api/src/modules/email/application/use-cases/send-templated-email.use-case.ts`
- Create: `apps/api/src/modules/email/application/use-cases/send-templated-email.use-case.spec.ts`
- Modify: `apps/api/src/modules/email/email.module.ts`

**Interfaces:**
- Consumes: `EmailTemplateService.render` (Task 3), `EmailPort.send` (Task 1).
- Produces: `SendTemplatedEmailUseCase.execute({type, to, variables}): Promise<void>` — nunca lanza. Usado por los 5 disparadores de admisión (Task 6) y el recordatorio de pensión (Task 8).

- [ ] **Step 1: Escribir el test (falla primero)**

`apps/api/src/modules/email/application/use-cases/send-templated-email.use-case.spec.ts`:

```ts
import { Logger } from '@nestjs/common';
import { SendTemplatedEmailUseCase } from './send-templated-email.use-case';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailPort } from '../ports/email.port';

describe('SendTemplatedEmailUseCase', () => {
  const templateService = { render: jest.fn() } as unknown as jest.Mocked<EmailTemplateService>;
  const emailPort = { send: jest.fn() } as unknown as jest.Mocked<EmailPort>;
  const useCase = new SendTemplatedEmailUseCase(templateService, emailPort);

  beforeEach(() => jest.clearAllMocks());

  it('renderiza la plantilla y envía el correo', async () => {
    templateService.render.mockResolvedValue({ subject: 'Asunto', html: '<p>Cuerpo</p>' });

    await useCase.execute({ type: 'solicitud_recibida', to: 'guardian@test.com', variables: { estudiante: 'Juan' } });

    expect(templateService.render).toHaveBeenCalledWith('solicitud_recibida', { estudiante: 'Juan' });
    expect(emailPort.send).toHaveBeenCalledWith({
      to: 'guardian@test.com',
      subject: 'Asunto',
      html: '<p>Cuerpo</p>',
    });
  });

  it('no propaga el error si el envío falla (mejor esfuerzo)', async () => {
    templateService.render.mockResolvedValue({ subject: 'Asunto', html: '<p>Cuerpo</p>' });
    emailPort.send.mockRejectedValue(new Error('Resend caído'));
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await expect(
      useCase.execute({ type: 'solicitud_recibida', to: 'guardian@test.com', variables: {} }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm --filter @eduapp/api test send-templated-email.use-case`
Expected: FAIL — `Cannot find module './send-templated-email.use-case'`

- [ ] **Step 3: Implementar el caso de uso**

`apps/api/src/modules/email/application/use-cases/send-templated-email.use-case.ts`:

```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailPort } from '../ports/email.port';
import { EmailTemplateType } from '../../domain/entities/email-template.entity';

export interface SendTemplatedEmailInput {
  type: EmailTemplateType;
  to: string;
  variables: Record<string, string>;
}

/**
 * Mejor esfuerzo: un fallo al renderizar o enviar el correo nunca debe
 * tumbar el flujo que lo dispara (guardar una solicitud, confirmar un
 * pago, etc.) — esa acción ya se completó antes de llamar acá. Mismo
 * criterio que `NotifyNewGradeService`.
 */
@Injectable()
export class SendTemplatedEmailUseCase {
  private readonly logger = new Logger(SendTemplatedEmailUseCase.name);

  constructor(
    private readonly templates: EmailTemplateService,
    @Inject(EmailPort) private readonly emailPort: EmailPort,
  ) {}

  async execute(input: SendTemplatedEmailInput): Promise<void> {
    try {
      const { subject, html } = await this.templates.render(input.type, input.variables);
      await this.emailPort.send({ to: input.to, subject, html });
    } catch (err) {
      this.logger.warn(
        `No se pudo enviar el correo "${input.type}" a "${input.to}": ${(err as Error).message}`,
      );
    }
  }
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `pnpm --filter @eduapp/api test send-templated-email.use-case`
Expected: PASS (2 tests)

- [ ] **Step 5: Registrar en el módulo**

En `apps/api/src/modules/email/email.module.ts`, agregar `SendTemplatedEmailUseCase` a `providers` y a `exports` (lo van a inyectar `AdmissionsModule` y `FinanceModule`):

```ts
  providers: [
    { provide: EmailPort, useClass: ResendEmailGateway },
    { provide: EmailTemplateRepositoryPort, useClass: TypeOrmEmailTemplateRepository },
    EmailTemplateService,
    SendTemplatedEmailUseCase,
  ],
  exports: [EmailPort, EmailTemplateRepositoryPort, SendTemplatedEmailUseCase],
```

(agregar el import correspondiente arriba del archivo)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/email
git commit -m "feat(email): agregar SendTemplatedEmailUseCase"
```

---

### Task 5: CRUD admin de plantillas (CASL + use-cases + controller)

**Files:**
- Modify: `apps/api/src/core/auth/casl/ability.ts`
- Modify: `apps/api/src/core/auth/casl/ability.factory.ts`
- Modify: `apps/api/src/core/auth/casl/ability.factory.spec.ts`
- Create: `apps/api/src/modules/email/application/use-cases/list-email-templates.use-case.ts`
- Create: `apps/api/src/modules/email/application/use-cases/list-email-templates.use-case.spec.ts`
- Create: `apps/api/src/modules/email/application/use-cases/update-email-template.use-case.ts`
- Create: `apps/api/src/modules/email/application/use-cases/update-email-template.use-case.spec.ts`
- Create: `apps/api/src/modules/email/interface/dtos/update-email-template.dto.ts`
- Create: `apps/api/src/modules/email/interface/controllers/email-templates.controller.ts`
- Modify: `apps/api/src/modules/email/email.module.ts`

**Interfaces:**
- Consumes: `EmailTemplateRepositoryPort` (Task 2), `DEFAULT_EMAIL_TEMPLATES` (Task 3).
- Produces: `GET /email-templates`, `PATCH /email-templates/:type`.

- [ ] **Step 1: Agregar el subject a CASL**

En `apps/api/src/core/auth/casl/ability.ts`, agregar `'EmailTemplate'` al union `AppSubjects` (antes de `'all'`):

```ts
  | 'Admission'
  | 'AuditLog'
  | 'EmailTemplate'
  | 'all';
```

- [ ] **Step 2: Otorgar el permiso a directivo**

En `apps/api/src/core/auth/casl/ability.factory.ts`, agregar `'EmailTemplate'` a la lista de `can('manage', [...])` de `directivo` (línea ~23-46). `admin_institucion` ya lo tiene cubierto por su `can('manage', 'all')`.

- [ ] **Step 3: Test de CASL (falla primero, luego pasa)**

Agregar a `apps/api/src/core/auth/casl/ability.factory.spec.ts`:

```ts
  it('directivo puede manage EmailTemplate', () => {
    const ability = factory.createForUser(payload(['directivo']));
    expect(ability.can('manage', 'EmailTemplate')).toBe(true);
  });

  it('docente no puede manage EmailTemplate', () => {
    const ability = factory.createForUser(payload(['docente']));
    expect(ability.can('manage', 'EmailTemplate')).toBe(false);
  });
```

Run: `pnpm --filter @eduapp/api test ability.factory` — debe pasar después del Step 2.

- [ ] **Step 4: DTO**

`apps/api/src/modules/email/interface/dtos/update-email-template.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class UpdateEmailTemplateDto {
  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  @MinLength(1)
  body: string;
}
```

- [ ] **Step 5: Escribir los tests de los use-cases (fallan primero)**

`apps/api/src/modules/email/application/use-cases/list-email-templates.use-case.spec.ts`:

```ts
import { ListEmailTemplatesUseCase } from './list-email-templates.use-case';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { EmailTemplate } from '../../domain/entities/email-template.entity';

describe('ListEmailTemplatesUseCase', () => {
  const templates: jest.Mocked<EmailTemplateRepositoryPort> = {
    findByType: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const useCase = new ListEmailTemplatesUseCase(templates);

  it('devuelve los 6 tipos, usando el default para los no personalizados', async () => {
    templates.findAll.mockResolvedValue([
      new EmailTemplate('t-1', 'solicitud_recibida', 'Asunto custom', '<p>Custom</p>', new Date().toISOString()),
    ]);

    const result = await useCase.execute();

    expect(result).toHaveLength(6);
    const custom = result.find((t) => t.type === 'solicitud_recibida');
    expect(custom?.subject).toBe('Asunto custom');
    expect(custom?.isCustom).toBe(true);
    const notCustom = result.find((t) => t.type === 'pago_aprobado');
    expect(notCustom?.isCustom).toBe(false);
  });
});
```

`apps/api/src/modules/email/application/use-cases/update-email-template.use-case.spec.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { UpdateEmailTemplateUseCase } from './update-email-template.use-case';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { EmailTemplate } from '../../domain/entities/email-template.entity';

jest.mock('node:crypto', () => ({ randomUUID: jest.fn(() => 'new-id') }));

describe('UpdateEmailTemplateUseCase', () => {
  const templates: jest.Mocked<EmailTemplateRepositoryPort> = {
    findByType: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const useCase = new UpdateEmailTemplateUseCase(templates);

  beforeEach(() => jest.clearAllMocks());

  it('edita la plantilla existente si ya fue personalizada', async () => {
    const existing = new EmailTemplate('t-1', 'pago_aprobado', 'Viejo', '<p>Viejo</p>', new Date().toISOString());
    templates.findByType.mockResolvedValue(existing);

    await useCase.execute('pago_aprobado', { subject: 'Nuevo', body: '<p>Nuevo</p>' });

    expect(templates.save).toHaveBeenCalledWith(expect.objectContaining({ id: 't-1', subject: 'Nuevo' }));
  });

  it('crea una plantilla nueva si el tenant nunca personalizó ese tipo', async () => {
    templates.findByType.mockResolvedValue(null);

    await useCase.execute('pago_aprobado', { subject: 'Nuevo', body: '<p>Nuevo</p>' });

    expect(templates.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-id', type: 'pago_aprobado' }));
  });
});
```

- [ ] **Step 6: Correr los tests para verificar que fallan**

Run: `pnpm --filter @eduapp/api test list-email-templates update-email-template`
Expected: FAIL — módulos no existen todavía

- [ ] **Step 7: Implementar los use-cases**

`apps/api/src/modules/email/application/use-cases/list-email-templates.use-case.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { EmailTemplateType } from '../../domain/entities/email-template.entity';
import { DEFAULT_EMAIL_TEMPLATES } from '../services/default-email-templates';

export interface EmailTemplateSummary {
  type: EmailTemplateType;
  subject: string;
  body: string;
  isCustom: boolean;
}

@Injectable()
export class ListEmailTemplatesUseCase {
  constructor(
    @Inject(EmailTemplateRepositoryPort) private readonly templates: EmailTemplateRepositoryPort,
  ) {}

  async execute(): Promise<EmailTemplateSummary[]> {
    const saved = await this.templates.findAll();
    const savedByType = new Map(saved.map((t) => [t.type, t]));

    return (Object.keys(DEFAULT_EMAIL_TEMPLATES) as EmailTemplateType[]).map((type) => {
      const custom = savedByType.get(type);
      const fallback = DEFAULT_EMAIL_TEMPLATES[type];
      return {
        type,
        subject: custom?.subject ?? fallback.subject,
        body: custom?.body ?? fallback.body,
        isCustom: !!custom,
      };
    });
  }
}
```

`apps/api/src/modules/email/application/use-cases/update-email-template.use-case.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { EmailTemplate, EmailTemplateType } from '../../domain/entities/email-template.entity';

export interface UpdateEmailTemplateInput {
  subject: string;
  body: string;
}

@Injectable()
export class UpdateEmailTemplateUseCase {
  constructor(
    @Inject(EmailTemplateRepositoryPort) private readonly templates: EmailTemplateRepositoryPort,
  ) {}

  async execute(type: EmailTemplateType, input: UpdateEmailTemplateInput): Promise<void> {
    const existing = await this.templates.findByType(type);
    if (existing) {
      existing.edit(input.subject, input.body);
      await this.templates.save(existing);
      return;
    }
    await this.templates.save(
      new EmailTemplate(randomUUID(), type, input.subject, input.body, new Date().toISOString()),
    );
  }
}
```

- [ ] **Step 8: Correr los tests para verificar que pasan**

Run: `pnpm --filter @eduapp/api test list-email-templates update-email-template`
Expected: PASS (3 tests)

- [ ] **Step 9: Controlador**

`apps/api/src/modules/email/interface/controllers/email-templates.controller.ts`:

```ts
import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { ListEmailTemplatesUseCase } from '../../application/use-cases/list-email-templates.use-case';
import { UpdateEmailTemplateUseCase } from '../../application/use-cases/update-email-template.use-case';
import { UpdateEmailTemplateDto } from '../dtos/update-email-template.dto';
import { EmailTemplateType } from '../../domain/entities/email-template.entity';

@Controller('email-templates')
@CheckPolicies((ability) => ability.can('manage', 'EmailTemplate'))
export class EmailTemplatesController {
  constructor(
    private readonly listTemplates: ListEmailTemplatesUseCase,
    private readonly updateTemplate: UpdateEmailTemplateUseCase,
  ) {}

  @Get()
  async list() {
    return this.listTemplates.execute();
  }

  @Patch(':type')
  async update(@Param('type') type: EmailTemplateType, @Body() dto: UpdateEmailTemplateDto) {
    await this.updateTemplate.execute(type, dto);
  }
}
```

- [ ] **Step 10: Registrar controlador y use-cases en el módulo**

En `apps/api/src/modules/email/email.module.ts`, agregar `controllers: [EmailTemplatesController]` y sumar `ListEmailTemplatesUseCase`, `UpdateEmailTemplateUseCase` a `providers`.

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/core/auth/casl apps/api/src/modules/email
git commit -m "feat(email): agregar CRUD administrable de plantillas de correo"
```

---

### Task 6: Disparadores de correo en el flujo de admisión

**Files:**
- Modify: `apps/api/src/modules/admissions/application/use-cases/create-admission-application.use-case.ts`
- Modify: `apps/api/src/modules/admissions/application/use-cases/create-admission-application.use-case.spec.ts`
- Modify: `apps/api/src/modules/admissions/application/use-cases/handle-admission-payment-webhook.use-case.ts`
- Modify: `apps/api/src/modules/admissions/application/use-cases/handle-admission-payment-webhook.use-case.spec.ts`
- Modify: `apps/api/src/modules/admissions/application/use-cases/accept-admission-application.use-case.ts`
- Modify: `apps/api/src/modules/admissions/application/use-cases/accept-admission-application.use-case.spec.ts`
- Modify: `apps/api/src/modules/admissions/application/use-cases/reject-admission-application.use-case.ts`
- Modify: `apps/api/src/modules/admissions/application/use-cases/reject-admission-application.use-case.spec.ts`
- Modify: `apps/api/src/modules/admissions/admissions.module.ts`

**Interfaces:**
- Consumes: `SendTemplatedEmailUseCase.execute` (Task 4).

- [ ] **Step 1: Test — `CreateAdmissionApplicationUseCase` envía "solicitud_recibida"**

En `create-admission-application.use-case.spec.ts`: agregar el import y el mock de `SendTemplatedEmailUseCase`, sumarlo a la construcción del use-case, y agregar el test nuevo (mismo patrón que `record-scores.use-case.spec.ts` con `NotifyNewGradeService`):

```ts
import { SendTemplatedEmailUseCase } from '../../../email/application/use-cases/send-templated-email.use-case';
```

```ts
  const sendEmail = { execute: jest.fn() } as unknown as jest.Mocked<SendTemplatedEmailUseCase>;

  const useCase = new CreateAdmissionApplicationUseCase(
    applications,
    attempts,
    gradeClosures,
    grades,
    academicYears,
    feeSchedules,
    gateway,
    sendEmail,
  );
```

Y el test nuevo, al final del `describe`:

```ts
  it('envía el correo de solicitud recibida con el trackingCode y el checkoutUrl', async () => {
    const result = await useCase.execute(input);

    expect(sendEmail.execute).toHaveBeenCalledWith({
      type: 'solicitud_recibida',
      to: 'maria@test.com',
      variables: {
        trackingCode: result.trackingCode,
        guardianName: 'María Pérez',
        estudiante: 'Juan Pérez',
        grado: 'Sexto',
        checkoutUrl: 'https://checkout.wompi.co/p/?reference=pref-1',
      },
    });
  });
```

Run: `pnpm --filter @eduapp/api test create-admission-application` → FAIL (el constructor todavía no acepta `sendEmail`).

- [ ] **Step 2: Implementar en `CreateAdmissionApplicationUseCase`**

Agregar el import y el parámetro del constructor:

```ts
import { SendTemplatedEmailUseCase } from '../../../email/application/use-cases/send-templated-email.use-case';
```

```ts
    @Inject(PaymentGatewayPort) private readonly gateway: PaymentGatewayPort,
    private readonly sendEmail: SendTemplatedEmailUseCase,
```

Después de `await this.attempts.save(attempt);` y antes del `return`:

```ts
    await this.sendEmail.execute({
      type: 'solicitud_recibida',
      to: input.guardianEmail,
      variables: {
        trackingCode: application.trackingCode,
        guardianName: input.guardianName,
        estudiante: `${input.studentFirstName} ${input.studentLastName}`,
        grado: grade.name,
        checkoutUrl,
      },
    });
```

Run: `pnpm --filter @eduapp/api test create-admission-application` → PASS

- [ ] **Step 3: Test — `HandleAdmissionPaymentWebhookUseCase` envía "pago_aprobado"/"pago_rechazado"**

En `handle-admission-payment-webhook.use-case.spec.ts`: agregar el import, el mock, sumarlo a la construcción del use-case, y ajustar/agregar tests:

```ts
import { SendTemplatedEmailUseCase } from '../../../email/application/use-cases/send-templated-email.use-case';
```

```ts
  const sendEmail = { execute: jest.fn() } as unknown as jest.Mocked<SendTemplatedEmailUseCase>;

  const useCase = new HandleAdmissionPaymentWebhookUseCase(applications, attempts, gateway, sendEmail);
```

Modificar el test existente "con pago approved" para pasarle `applications.findById` (ya lo hace) y agregar la aserción del correo:

```ts
  it('con pago approved: marca el intento approved y la solicitud pendiente_entrevista, y envía el correo', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'approved',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(buildAttempt('pending'));
    applications.findById.mockResolvedValue(buildApplication());

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(attempts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
    expect(applications.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pendiente_entrevista' }),
    );
    expect(sendEmail.execute).toHaveBeenCalledWith({
      type: 'pago_aprobado',
      to: 'maria@test.com',
      variables: { trackingCode: 'SOL-A8F3K2' },
    });
  });
```

Modificar el test existente "con pago rejected" para que también mockee `applications.findById` y agregar la aserción del correo:

```ts
  it('con pago rejected: marca el intento rejected, no toca la solicitud, y envía el correo', async () => {
    gateway.getPaymentInfo.mockResolvedValue({
      status: 'rejected',
      paymentMethodId: 'CARD',
      externalReference: 'att-1',
    });
    attempts.findById.mockResolvedValue(buildAttempt('pending'));
    applications.findById.mockResolvedValue(buildApplication());

    await useCase.execute({ event: 'transaction.updated', data: { transaction: { id: 'txn-1' } } });

    expect(attempts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }));
    expect(applications.save).not.toHaveBeenCalled();
    expect(sendEmail.execute).toHaveBeenCalledWith({
      type: 'pago_rechazado',
      to: 'maria@test.com',
      variables: { trackingCode: 'SOL-A8F3K2' },
    });
  });
```

Run: `pnpm --filter @eduapp/api test handle-admission-payment-webhook` → FAIL (constructor no acepta `sendEmail` todavía)

- [ ] **Step 4: Implementar en `HandleAdmissionPaymentWebhookUseCase`**

El código actual solo busca `application` dentro de la rama `approved`. Se mueve arriba para reusarla en ambas ramas:

```ts
import { SendTemplatedEmailUseCase } from '../../../email/application/use-cases/send-templated-email.use-case';
```

```ts
    @Inject(PaymentGatewayPort) private readonly gateway: PaymentGatewayPort,
    private readonly sendEmail: SendTemplatedEmailUseCase,
```

Reemplazar el bloque final del método:

```ts
    if (attempt.status === 'approved') return;

    const application = await this.applications.findById(attempt.admissionApplicationId);

    if (info.status === 'approved') {
      attempt.approve();
      await this.attempts.save(attempt);

      if (application) {
        application.markPaid();
        await this.applications.save(application);
        await this.sendEmail.execute({
          type: 'pago_aprobado',
          to: application.guardianEmail,
          variables: { trackingCode: application.trackingCode },
        });
      }
    } else if (info.status === 'rejected') {
      attempt.reject();
      await this.attempts.save(attempt);

      if (application) {
        await this.sendEmail.execute({
          type: 'pago_rechazado',
          to: application.guardianEmail,
          variables: { trackingCode: application.trackingCode },
        });
      }
    }
```

Run: `pnpm --filter @eduapp/api test handle-admission-payment-webhook` → PASS

- [ ] **Step 5: Test — `AcceptAdmissionApplicationUseCase` envía "solicitud_aceptada"**

En `accept-admission-application.use-case.spec.ts`: agregar el import, el mock, sumarlo a la construcción del use-case, y agregar el test (usando el caso "aspirante nuevo" ya existente como base):

```ts
import { SendTemplatedEmailUseCase } from '../../../email/application/use-cases/send-templated-email.use-case';
```

```ts
  const sendEmail = { execute: jest.fn() } as unknown as jest.Mocked<SendTemplatedEmailUseCase>;

  const useCase = new AcceptAdmissionApplicationUseCase(applications, users, sendEmail);
```

```ts
  it('envía el correo de solicitud aceptada', async () => {
    applications.findById.mockResolvedValue(build('pendiente_entrevista'));

    await useCase.execute('app-1');

    expect(sendEmail.execute).toHaveBeenCalledWith({
      type: 'solicitud_aceptada',
      to: 'maria@test.com',
      variables: { trackingCode: 'SOL-A8F3K2', estudiante: 'Juan Pérez' },
    });
  });
```

Run: `pnpm --filter @eduapp/api test accept-admission-application` → FAIL (constructor no acepta `sendEmail` todavía)

- [ ] **Step 6: Implementar en `AcceptAdmissionApplicationUseCase`**

```ts
import { SendTemplatedEmailUseCase } from '../../../email/application/use-cases/send-templated-email.use-case';
```

```ts
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    private readonly sendEmail: SendTemplatedEmailUseCase,
```

Antes del `return`:

```ts
    await this.sendEmail.execute({
      type: 'solicitud_aceptada',
      to: application.guardianEmail,
      variables: {
        trackingCode: application.trackingCode,
        estudiante: `${application.studentFirstName} ${application.studentLastName}`,
      },
    });
```

Run: `pnpm --filter @eduapp/api test accept-admission-application` → PASS

- [ ] **Step 7: Test — `RejectAdmissionApplicationUseCase` envía "solicitud_rechazada"**

En `reject-admission-application.use-case.spec.ts`: agregar el import, el mock, sumarlo a la construcción del use-case, y agregar el test:

```ts
import { SendTemplatedEmailUseCase } from '../../../email/application/use-cases/send-templated-email.use-case';
```

```ts
  const sendEmail = { execute: jest.fn() } as unknown as jest.Mocked<SendTemplatedEmailUseCase>;

  const useCase = new RejectAdmissionApplicationUseCase(applications, sendEmail);
```

```ts
  it('envía el correo de solicitud rechazada', async () => {
    applications.findById.mockResolvedValue(build('pendiente_entrevista'));

    await useCase.execute('app-1', 'Cupo lleno');

    expect(sendEmail.execute).toHaveBeenCalledWith({
      type: 'solicitud_rechazada',
      to: 'maria@test.com',
      variables: { trackingCode: 'SOL-A8F3K2', estudiante: 'Juan Pérez' },
    });
  });
```

Run: `pnpm --filter @eduapp/api test reject-admission-application` → FAIL (constructor no acepta `sendEmail` todavía)

- [ ] **Step 8: Implementar en `RejectAdmissionApplicationUseCase`**

```ts
import { SendTemplatedEmailUseCase } from '../../../email/application/use-cases/send-templated-email.use-case';
```

```ts
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    private readonly sendEmail: SendTemplatedEmailUseCase,
```

Antes del `return application;`:

```ts
    await this.sendEmail.execute({
      type: 'solicitud_rechazada',
      to: application.guardianEmail,
      variables: {
        trackingCode: application.trackingCode,
        estudiante: `${application.studentFirstName} ${application.studentLastName}`,
      },
    });
```

Run: `pnpm --filter @eduapp/api test reject-admission-application` → PASS

- [ ] **Step 9: Registrar `EmailModule` en `AdmissionsModule`**

En `apps/api/src/modules/admissions/admissions.module.ts`, agregar el import y sumarlo a `imports`:

```ts
import { EmailModule } from '../email/email.module';
```

```ts
  imports: [AcademicModule, FinanceModule, IdentityModule, EmailModule],
```

- [ ] **Step 10: Correr toda la suite de admisiones**

Run: `pnpm --filter @eduapp/api test admissions`
Expected: PASS (todos los tests existentes + los nuevos)

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/modules/admissions
git commit -m "feat(admissions): enviar correo en solicitud recibida, pago y decisión de admisión"
```

---

### Task 7: `PensionReminderLog` + migración + repositorio

**Files:**
- Create: `apps/api/src/modules/finance/domain/entities/pension-reminder-log.entity.ts`
- Create: `apps/api/src/core/database/migrations/tenant/1700000000061-CreatePensionReminderLog.ts`
- Create: `apps/api/src/modules/finance/application/ports/pension-reminder-log.repository.port.ts`
- Create: `apps/api/src/modules/finance/infrastructure/entities/pension-reminder-log.orm-entity.ts`
- Create: `apps/api/src/modules/finance/infrastructure/repositories/typeorm-pension-reminder-log.repository.ts`
- Create: `apps/api/src/modules/finance/infrastructure/repositories/typeorm-pension-reminder-log.repository.spec.ts`

**Interfaces:**
- Produces: `PensionReminderLogRepositoryPort` (`existsByChargeId`, `save`) — usado por `SendPensionReminderTask` (Task 8).

- [ ] **Step 1: Entidad de dominio**

`apps/api/src/modules/finance/domain/entities/pension-reminder-log.entity.ts`:

```ts
export class PensionReminderLog {
  constructor(
    public readonly id: string,
    public readonly chargeId: string,
    public readonly sentAt: string,
  ) {}
}
```

- [ ] **Step 2: Migración**

`apps/api/src/core/database/migrations/tenant/1700000000061-CreatePensionReminderLog.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registra qué cargos de pensión ya recibieron el recordatorio de
 * vencimiento, para que `SendPensionReminderTask` no lo reenvíe todos los
 * días mientras el cargo siga impago (se decidió "una sola vez", ver spec).
 * Tabla aditiva — no toca `charges`.
 */
export class CreatePensionReminderLog1700000000061 implements MigrationInterface {
  name = 'CreatePensionReminderLog1700000000061';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pension_reminder_log" (
        "id" uuid PRIMARY KEY,
        "charge_id" uuid NOT NULL UNIQUE REFERENCES "charges"("id") ON DELETE CASCADE,
        "sent_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pension_reminder_log"`);
  }
}
```

- [ ] **Step 3: Puerto**

`apps/api/src/modules/finance/application/ports/pension-reminder-log.repository.port.ts`:

```ts
import { PensionReminderLog } from '../../domain/entities/pension-reminder-log.entity';

export abstract class PensionReminderLogRepositoryPort {
  abstract existsByChargeId(chargeId: string): Promise<boolean>;
  abstract save(log: PensionReminderLog): Promise<void>;
}
```

- [ ] **Step 4: Entidad ORM**

`apps/api/src/modules/finance/infrastructure/entities/pension-reminder-log.orm-entity.ts`:

```ts
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'pension_reminder_log' })
export class PensionReminderLogOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'charge_id', type: 'uuid', unique: true })
  chargeId: string;

  @Column({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;
}
```

- [ ] **Step 5: Escribir el test del repositorio (falla primero)**

`apps/api/src/modules/finance/infrastructure/repositories/typeorm-pension-reminder-log.repository.spec.ts`:

```ts
import { DataSource } from 'typeorm';
import { TypeOrmPensionReminderLogRepository } from './typeorm-pension-reminder-log.repository';
import { PensionReminderLog } from '../../domain/entities/pension-reminder-log.entity';
import { PensionReminderLogOrmEntity } from '../entities/pension-reminder-log.orm-entity';

describe('TypeOrmPensionReminderLogRepository', () => {
  let dataSource: DataSource;
  let repo: TypeOrmPensionReminderLogRepository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [PensionReminderLogOrmEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    repo = new TypeOrmPensionReminderLogRepository(dataSource);
  });

  afterAll(() => dataSource.destroy());

  it('existsByChargeId es false antes de guardar y true después', async () => {
    expect(await repo.existsByChargeId('charge-1')).toBe(false);

    await repo.save(new PensionReminderLog('log-1', 'charge-1', new Date().toISOString()));

    expect(await repo.existsByChargeId('charge-1')).toBe(true);
  });
});
```

- [ ] **Step 6: Correr el test para verificar que falla**

Run: `pnpm --filter @eduapp/api test typeorm-pension-reminder-log.repository`
Expected: FAIL — `Cannot find module './typeorm-pension-reminder-log.repository'`

- [ ] **Step 7: Implementar el repositorio**

`apps/api/src/modules/finance/infrastructure/repositories/typeorm-pension-reminder-log.repository.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PensionReminderLogRepositoryPort } from '../../application/ports/pension-reminder-log.repository.port';
import { PensionReminderLog } from '../../domain/entities/pension-reminder-log.entity';
import { PensionReminderLogOrmEntity } from '../entities/pension-reminder-log.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmPensionReminderLogRepository extends PensionReminderLogRepositoryPort {
  private readonly repo: Repository<PensionReminderLogOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(PensionReminderLogOrmEntity);
  }

  async existsByChargeId(chargeId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { chargeId } });
    return count > 0;
  }

  async save(log: PensionReminderLog): Promise<void> {
    await this.repo.save({ id: log.id, chargeId: log.chargeId, sentAt: new Date(log.sentAt) });
  }
}
```

- [ ] **Step 8: Correr el test para verificar que pasa**

Run: `pnpm --filter @eduapp/api test typeorm-pension-reminder-log.repository`
Expected: PASS

- [ ] **Step 9: Registrar en `FinanceModule`**

En `apps/api/src/modules/finance/finance.module.ts`, agregar el import, sumar `{ provide: PensionReminderLogRepositoryPort, useClass: TypeOrmPensionReminderLogRepository }` a `providers`.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/finance apps/api/src/core/database/migrations/tenant/1700000000061-CreatePensionReminderLog.ts
git commit -m "feat(finance): agregar PensionReminderLog para el recordatorio de pensión vencida"
```

---

### Task 8: `SendPensionReminderTask` (cron diario multi-tenant)

**Files:**
- Modify: `apps/api/package.json` (dependencia `@nestjs/schedule`)
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/modules/finance/application/services/send-pension-reminder.task.ts`
- Create: `apps/api/src/modules/finance/application/services/send-pension-reminder.task.spec.ts`
- Modify: `apps/api/src/modules/finance/finance.module.ts`

**Interfaces:**
- Consumes: `TenantRepositoryPort.findAll` (`platform` module), `TenantConnectionProvider.getConnectionForSchema` (`core/database`), `ChargeRepositoryPort`/`PaymentRepositoryPort`/`EnrollmentRepositoryPort`/`UserRepositoryPort`/`GuardianLinkRepositoryPort` (construidos manualmente con la `DataSource` de cada tenant — ver razón en Global Constraints), `EmailTemplateRepositoryPort` + `EmailPort` (ídem), `SendTemplatedEmailUseCase`-equivalente construido a mano.

- [ ] **Step 1: Instalar `@nestjs/schedule`**

```bash
cd apps/api && pnpm add @nestjs/schedule
```

- [ ] **Step 2: Registrar `ScheduleModule.forRoot()` con alias en `AppModule`**

En `apps/api/src/app.module.ts`, agregar el import aliaseado (evita la colisión de nombres con el `ScheduleModule` de horarios, ver Global Constraints):

```ts
import { ScheduleModule as CronScheduleModule } from '@nestjs/schedule';
```

Y agregar `CronScheduleModule.forRoot()` a `imports` (por ejemplo, justo después de `ConfigModule.forRoot(...)`):

```ts
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    CronScheduleModule.forRoot(),
```

- [ ] **Step 3: Escribir el test de la tarea (falla primero)**

`apps/api/src/modules/finance/application/services/send-pension-reminder.task.spec.ts`:

```ts
import { SendPensionReminderTask } from './send-pension-reminder.task';
import { TenantRepositoryPort } from '../../../platform/application/ports/tenant.repository.port';
import { TenantConnectionProvider } from '../../../../core/database/tenant-connection.provider';
import { EmailPort } from '../../../email/application/ports/email.port';
import { Tenant } from '../../../platform/domain/entities/tenant.entity';
import { DataSource } from 'typeorm';

describe('SendPensionReminderTask', () => {
  const tenants = { findAll: jest.fn() } as unknown as jest.Mocked<TenantRepositoryPort>;
  const connections = { getConnectionForSchema: jest.fn() } as unknown as jest.Mocked<TenantConnectionProvider>;
  const emailPort = { send: jest.fn() } as unknown as jest.Mocked<EmailPort>;

  const task = new SendPensionReminderTask(tenants, connections, emailPort);

  const activeTenant = new Tenant('tenant-1', 'Colegio Demo', 'demo', null, 'tenant_colegio_demo', 'active', [], null, null);
  const suspendedTenant = new Tenant('tenant-2', 'Colegio Suspendido', 'susp', null, 'tenant_susp', 'suspended', [], null, null);

  beforeEach(() => jest.clearAllMocks());

  it('salta los tenants suspendidos sin abrir conexión', async () => {
    tenants.findAll.mockResolvedValue([suspendedTenant]);

    await task.run();

    expect(connections.getConnectionForSchema).not.toHaveBeenCalled();
  });

  it('procesa cada tenant activo por separado, sin que uno rompa a los demás', async () => {
    tenants.findAll.mockResolvedValue([activeTenant]);
    connections.getConnectionForSchema.mockRejectedValue(new Error('conexión caída'));

    await expect(task.run()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 4: Correr el test para verificar que falla**

Run: `pnpm --filter @eduapp/api test send-pension-reminder.task`
Expected: FAIL — `Cannot find module './send-pension-reminder.task'`

- [ ] **Step 5: Implementar la tarea**

`apps/api/src/modules/finance/application/services/send-pension-reminder.task.ts`:

```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { TenantRepositoryPort } from '../../../platform/application/ports/tenant.repository.port';
import { TenantConnectionProvider } from '../../../../core/database/tenant-connection.provider';
import { EmailPort } from '../../../email/application/ports/email.port';
import { EmailTemplateService } from '../../../email/application/services/email-template.service';
import { TypeOrmEmailTemplateRepository } from '../../../email/infrastructure/repositories/typeorm-email-template.repository';
import { TypeOrmChargeRepository } from '../../infrastructure/repositories/typeorm-charge.repository';
import { TypeOrmPaymentRepository } from '../../infrastructure/repositories/typeorm-payment.repository';
import { TypeOrmPensionReminderLogRepository } from '../../infrastructure/repositories/typeorm-pension-reminder-log.repository';
import { TypeOrmEnrollmentRepository } from '../../../enrollment/infrastructure/repositories/typeorm-enrollment.repository';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { TypeOrmGuardianLinkRepository } from '../../../identity/infrastructure/repositories/typeorm-guardian-link.repository';
import { GuardianAccessService } from '../../../identity/application/services/guardian-access.service';
import { PensionReminderLog } from '../../domain/entities/pension-reminder-log.entity';

/**
 * Corre una vez al día (8am) y recorre TODOS los tenants — no hay contexto
 * de request HTTP acá, así que en vez de depender de `TENANT_DATA_SOURCE`
 * (Scope.REQUEST, requeriría simular un request) se construyen los
 * repositorios a mano por cada tenant, pasándoles la `DataSource` de su
 * schema directamente — mismo criterio que
 * `run-migrations-all-tenants.ts` para trabajo cross-tenant fuera de un
 * request real.
 */
@Injectable()
export class SendPensionReminderTask {
  private readonly logger = new Logger(SendPensionReminderTask.name);

  constructor(
    @Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort,
    private readonly connections: TenantConnectionProvider,
    @Inject(EmailPort) private readonly emailPort: EmailPort,
  ) {}

  @Cron('0 8 * * *')
  async run(): Promise<void> {
    const allTenants = await this.tenants.findAll();
    const activeTenants = allTenants.filter((t) => t.status === 'active');

    for (const tenant of activeTenants) {
      try {
        await this.processTenant(tenant.schemaName);
      } catch (err) {
        this.logger.warn(
          `Recordatorio de pensión falló para el tenant "${tenant.schemaName}": ${(err as Error).message}`,
        );
      }
    }
  }

  private async processTenant(schemaName: string): Promise<void> {
    const dataSource: DataSource = await this.connections.getConnectionForSchema(schemaName);

    const charges = new TypeOrmChargeRepository(dataSource);
    const payments = new TypeOrmPaymentRepository(dataSource);
    const reminderLog = new TypeOrmPensionReminderLogRepository(dataSource);
    const enrollments = new TypeOrmEnrollmentRepository(dataSource);
    const users = new TypeOrmUserRepository(dataSource);
    const guardianAccess = new GuardianAccessService(new TypeOrmGuardianLinkRepository(dataSource));
    const templateService = new EmailTemplateService(new TypeOrmEmailTemplateRepository(dataSource));

    const today = new Date().toISOString().slice(0, 10);
    const pensionCharges = (await charges.findAll({ concept: 'pension' })).filter(
      (c) => !c.voidedAt && c.dueDate < today,
    );

    for (const charge of pensionCharges) {
      if (await reminderLog.existsByChargeId(charge.id)) continue;

      const chargePayments = await payments.findAll({ chargeId: charge.id });
      const paid = chargePayments
        .filter((p) => !p.voidedAt)
        .reduce((sum, p) => sum + p.amount, 0);
      if (charge.computeBalance(paid) <= 0) continue;

      const enrollment = await enrollments.findById(charge.enrollmentId);
      if (!enrollment) continue;

      const student = await users.findById(enrollment.studentId);
      const guardianIds = await guardianAccess.getGuardianIds(enrollment.studentId);
      const guardians = await Promise.all(guardianIds.map((id) => users.findById(id)));
      const recipients = [student, ...guardians].filter((u): u is NonNullable<typeof u> => !!u);

      const variables = {
        estudiante: student?.fullName ?? 'el estudiante',
        fechaVencimiento: charge.dueDate,
        monto: charge.computeBalance(paid).toString(),
      };

      for (const recipient of recipients) {
        try {
          const { subject, html } = await templateService.render('recordatorio_pension', variables);
          await this.emailPort.send({ to: recipient.email, subject, html });
        } catch (err) {
          this.logger.warn(
            `No se pudo enviar el recordatorio de pensión a "${recipient.email}": ${(err as Error).message}`,
          );
        }
      }

      await reminderLog.save(new PensionReminderLog(crypto.randomUUID(), charge.id, new Date().toISOString()));
    }
  }
}
```

- [ ] **Step 6: Correr el test para verificar que pasa**

Run: `pnpm --filter @eduapp/api test send-pension-reminder.task`
Expected: PASS (2 tests)

- [ ] **Step 7: Registrar en `FinanceModule`**

En `apps/api/src/modules/finance/finance.module.ts`:

```ts
import { SendPensionReminderTask } from './application/services/send-pension-reminder.task';
import { PlatformModule } from '../platform/platform.module';
import { EmailModule } from '../email/email.module';
```

```ts
  imports: [EnrollmentModule, IdentityModule, AcademicModule, PlatformModule, EmailModule],
```

Agregar `SendPensionReminderTask` a `providers`.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/modules/finance apps/api/package.json apps/api/pnpm-lock.yaml
git commit -m "feat(finance): agregar recordatorio diario de pensión vencida por correo"
```

---

### Task 9: Frontend — pantalla de administración de plantillas

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Create: `apps/web/src/app/api/email-templates/route.ts`
- Create: `apps/web/src/app/api/email-templates/[type]/route.ts`
- Create: `apps/web/src/features/email-templates/use-email-templates.ts`
- Create: `apps/web/src/features/email-templates/email-templates-view.tsx`
- Create: `apps/web/src/app/(dashboard)/email-templates/page.tsx`
- Modify: `apps/web/src/lib/nav-config.ts`

**Interfaces:**
- Consumes: `GET/PATCH /email-templates` (Task 5).

- [ ] **Step 1: Tipo compartido**

En `packages/shared-types/src/index.ts`, agregar (cerca de `GradeWeightConfig`):

```ts
export type EmailTemplateType =
  | 'solicitud_recibida'
  | 'pago_aprobado'
  | 'pago_rechazado'
  | 'solicitud_aceptada'
  | 'solicitud_rechazada'
  | 'recordatorio_pension';

export interface EmailTemplateSummary {
  type: EmailTemplateType;
  subject: string;
  body: string;
  isCustom: boolean;
}
```

- [ ] **Step 2: API routes proxy**

`apps/web/src/app/api/email-templates/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { EmailTemplateSummary } from '@eduapp/shared-types';

export async function GET() {
  const templates = await serverApiFetch<EmailTemplateSummary[]>('/email-templates');
  if (templates === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(templates);
}
```

`apps/web/src/app/api/email-templates/[type]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';

export async function PATCH(req: NextRequest, { params }: { params: { type: string } }) {
  const body = await req.json();
  const result = await serverApiFetch(`/email-templates/${params.type}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (result === null) {
    return NextResponse.json({ message: 'No se pudo actualizar la plantilla' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Hook TanStack Query**

`apps/web/src/features/email-templates/use-email-templates.ts`:

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmailTemplateSummary, EmailTemplateType } from '@eduapp/shared-types';

async function fetchEmailTemplates(): Promise<EmailTemplateSummary[]> {
  const res = await fetch('/api/email-templates');
  if (!res.ok) throw new Error('No se pudieron cargar las plantillas de correo');
  return res.json();
}

export interface UpdateEmailTemplateInput {
  type: EmailTemplateType;
  subject: string;
  body: string;
}

async function updateEmailTemplate(input: UpdateEmailTemplateInput): Promise<void> {
  const res = await fetch(`/api/email-templates/${input.type}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject: input.subject, body: input.body }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo actualizar la plantilla');
  }
}

export function useEmailTemplates() {
  return useQuery({ queryKey: ['email-templates'], queryFn: fetchEmailTemplates, staleTime: 5 * 60 * 1000 });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateEmailTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-templates'] }),
  });
}
```

- [ ] **Step 4: Vista**

`apps/web/src/features/email-templates/email-templates-view.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useEmailTemplates, useUpdateEmailTemplate } from './use-email-templates';
import type { EmailTemplateType } from '@eduapp/shared-types';

const LABELS: Record<EmailTemplateType, string> = {
  solicitud_recibida: 'Solicitud de admisión recibida',
  pago_aprobado: 'Pago de admisión aprobado',
  pago_rechazado: 'Pago de admisión rechazado',
  solicitud_aceptada: 'Solicitud de admisión aceptada',
  solicitud_rechazada: 'Solicitud de admisión rechazada',
  recordatorio_pension: 'Recordatorio de pensión vencida',
};

const PLACEHOLDERS: Record<EmailTemplateType, string[]> = {
  solicitud_recibida: ['{{guardianName}}', '{{estudiante}}', '{{grado}}', '{{trackingCode}}', '{{checkoutUrl}}'],
  pago_aprobado: ['{{trackingCode}}'],
  pago_rechazado: ['{{trackingCode}}'],
  solicitud_aceptada: ['{{trackingCode}}', '{{estudiante}}'],
  solicitud_rechazada: ['{{trackingCode}}', '{{estudiante}}'],
  recordatorio_pension: ['{{estudiante}}', '{{fechaVencimiento}}', '{{monto}}'],
};

export function EmailTemplatesView() {
  const { data: templates, isLoading } = useEmailTemplates();
  const updateTemplate = useUpdateEmailTemplate();
  const [editing, setEditing] = useState<{ type: EmailTemplateType; subject: string; body: string } | null>(null);

  if (isLoading) return <p>Cargando plantillas...</p>;

  return (
    <div className="space-y-4">
      {templates?.map((template) => (
        <div key={template.type} className="rounded border p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{LABELS[template.type]}</h3>
            {!template.isCustom && <span className="text-xs text-gray-500">Usando texto por defecto</span>}
          </div>
          {editing?.type === template.type ? (
            <div className="mt-2 space-y-2">
              <input
                className="w-full rounded border px-2 py-1"
                value={editing.subject}
                onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
              />
              <textarea
                className="w-full rounded border px-2 py-1"
                rows={4}
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
              <p className="text-xs text-gray-500">Placeholders disponibles: {PLACEHOLDERS[template.type].join(', ')}</p>
              <div className="flex gap-2">
                <button
                  className="rounded bg-blue-600 px-3 py-1 text-white"
                  onClick={() => {
                    updateTemplate.mutate({ type: template.type, subject: editing.subject, body: editing.body });
                    setEditing(null);
                  }}
                >
                  Guardar
                </button>
                <button className="rounded border px-3 py-1" onClick={() => setEditing(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-gray-700">{template.subject}</p>
              <button
                className="mt-2 text-sm text-blue-600 underline"
                onClick={() => setEditing({ type: template.type, subject: template.subject, body: template.body })}
              >
                Editar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Página**

`apps/web/src/app/(dashboard)/email-templates/page.tsx`:

```tsx
import { EmailTemplatesView } from '@/features/email-templates/email-templates-view';

export default function EmailTemplatesPage() {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Plantillas de correo</h1>
      <EmailTemplatesView />
    </div>
  );
}
```

- [ ] **Step 6: Nav link**

En `apps/web/src/lib/nav-config.ts`, agregar en el mismo grupo que `/audit` (línea ~94):

```ts
      { href: '/email-templates', label: 'Plantillas de correo', icon: Mail, roles: ADMIN },
```

(agregar `Mail` al import de `lucide-react` si no está ya importado)

- [ ] **Step 7: Verificar en el navegador**

Levantar el frontend (`pnpm --filter @eduapp/web dev`), loguearse como `admin_institucion` o `directivo`, navegar a `/email-templates`, confirmar que aparecen los 6 tipos con su texto por defecto, editar uno, guardar, refrescar y confirmar que persiste y queda marcado como personalizado.

- [ ] **Step 8: Commit**

```bash
git add packages/shared-types apps/web/src/app/api/email-templates apps/web/src/features/email-templates apps/web/src/app/\(dashboard\)/email-templates apps/web/src/lib/nav-config.ts
git commit -m "feat(email): agregar pantalla de administración de plantillas de correo"
```
