# Chatbot de preguntas frecuentes (FAQ) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un chatbot de preguntas frecuentes institucionales sin IA —
admin/directivo/secretaría cargan preguntas y respuestas fijas, y
cualquier usuario las busca por palabra clave desde un widget flotante.

**Architecture:** Módulo NestJS nuevo (`faq`), standalone (sin
dependencias de otros módulos), con un CRUD simple sobre una sola entidad
`FaqEntry` y un endpoint de búsqueda que filtra en memoria por substring
(sin acentos, sin distinguir mayúsculas) contra pregunta y respuesta. En
el frontend, un widget flotante con buscador (reemplaza el que se había
diseñado para el asistente de IA descartado) y una página de
administración con el CRUD.

**Tech Stack:** NestJS + TypeORM (backend, ya en el repo), Next.js 14 +
React Query (frontend, ya en el repo). Sin librerías nuevas, sin
infraestructura externa.

**Spec:** `docs/superpowers/specs/2026-08-31-faq-chatbot-design.md`

## Global Constraints

- **Todos los roles** pueden usar el buscador (`GET /faq`, `GET
  /faq/search`) — es información institucional, no datos personales.
- Solo `admin_institucion`, `directivo` y `secretaria` pueden
  crear/editar/eliminar preguntas — mismo criterio que Comunicados y
  Documentos.
- Búsqueda por substring (case-insensitive, sin acentos) contra
  `question` **y** `answer` — sin tabla de tags/keywords separada.
- Sin full-text search de Postgres, sin categorías, sin analítica — fuera
  de alcance v1 (ver spec).
- El widget solo lee — nunca escribe.

---

## Task 1: Entidad de dominio `FaqEntry`

**Files:**
- Create: `apps/api/src/modules/faq/domain/entities/faq-entry.entity.ts`
- Test: `apps/api/src/modules/faq/domain/entities/faq-entry.entity.spec.ts`

**Interfaces:**
- Produces: `FaqEntry` construida como `new FaqEntry(id: string, question: string, answer: string,
  createdAt: string, updatedAt: string)`, con `id`/`createdAt` de solo lectura y
  `question`/`answer`/`updatedAt` mutables solo a través del método `edit(question: string, answer: string): void`.

- [ ] **Step 1: Escribir el test que falla**

```ts
import { FaqEntry } from './faq-entry.entity';

describe('FaqEntry', () => {
  it('crea una pregunta válida', () => {
    const entry = new FaqEntry(
      'faq-1',
      '¿Cómo pido un certificado?',
      'Se pide en secretaría.',
      '2026-08-31T10:00:00.000Z',
      '2026-08-31T10:00:00.000Z',
    );
    expect(entry.id).toBe('faq-1');
    expect(entry.question).toBe('¿Cómo pido un certificado?');
    expect(entry.answer).toBe('Se pide en secretaría.');
  });

  it('rechaza pregunta vacía', () => {
    expect(
      () =>
        new FaqEntry('faq-1', '   ', 'respuesta', '2026-08-31T10:00:00.000Z', '2026-08-31T10:00:00.000Z'),
    ).toThrow('La pregunta no puede estar vacía');
  });

  it('rechaza respuesta vacía', () => {
    expect(
      () =>
        new FaqEntry('faq-1', 'pregunta', '   ', '2026-08-31T10:00:00.000Z', '2026-08-31T10:00:00.000Z'),
    ).toThrow('La respuesta no puede estar vacía');
  });

  it('edit() actualiza pregunta, respuesta y updatedAt', () => {
    const entry = new FaqEntry(
      'faq-1',
      'vieja',
      'vieja resp',
      '2026-08-31T10:00:00.000Z',
      '2026-08-31T10:00:00.000Z',
    );
    entry.edit('nueva', 'nueva resp');
    expect(entry.question).toBe('nueva');
    expect(entry.answer).toBe('nueva resp');
    expect(entry.updatedAt).not.toBe('2026-08-31T10:00:00.000Z');
  });

  it('edit() rechaza pregunta vacía', () => {
    const entry = new FaqEntry(
      'faq-1',
      'vieja',
      'vieja resp',
      '2026-08-31T10:00:00.000Z',
      '2026-08-31T10:00:00.000Z',
    );
    expect(() => entry.edit('   ', 'nueva resp')).toThrow('La pregunta no puede estar vacía');
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `pnpm --filter @eduapp/api test -- faq-entry.entity`
Expected: FAIL — no existe el módulo `./faq-entry.entity`.

- [ ] **Step 3: Implementación mínima**

```ts
export class FaqEntry {
  constructor(
    public readonly id: string,
    public question: string,
    public answer: string,
    public readonly createdAt: string,
    public updatedAt: string,
  ) {
    if (!question.trim()) {
      throw new Error('La pregunta no puede estar vacía');
    }
    if (!answer.trim()) {
      throw new Error('La respuesta no puede estar vacía');
    }
  }

  edit(question: string, answer: string): void {
    if (!question.trim()) {
      throw new Error('La pregunta no puede estar vacía');
    }
    if (!answer.trim()) {
      throw new Error('La respuesta no puede estar vacía');
    }
    this.question = question;
    this.answer = answer;
    this.updatedAt = new Date().toISOString();
  }
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `pnpm --filter @eduapp/api test -- faq-entry.entity`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/faq/domain/entities/faq-entry.entity.ts apps/api/src/modules/faq/domain/entities/faq-entry.entity.spec.ts
git commit -m "feat(faq): entidad de dominio FaqEntry"
```

---

## Task 2: Persistencia — puerto, entidad ORM, repositorio, migración

**Files:**
- Create: `apps/api/src/modules/faq/application/ports/faq.repository.port.ts`
- Create: `apps/api/src/modules/faq/infrastructure/entities/faq-entry.orm-entity.ts`
- Create: `apps/api/src/modules/faq/infrastructure/repositories/typeorm-faq.repository.ts`
- Create: `apps/api/src/core/database/migrations/tenant/1700000000048-CreateFaqEntries.ts`
- Modify: `apps/api/src/core/database/tenant.datasource.ts` (agregar `'faq'` a `TENANT_MODULES`)

**Interfaces:**
- Consumes: `FaqEntry` de Task 1; `TENANT_DATA_SOURCE` de
  `apps/api/src/core/database/tenant-datasource.provider.ts`.
- Produces: `FaqRepositoryPort` (clase abstracta) con `findAll(): Promise<FaqEntry[]>`,
  `findById(id: string): Promise<FaqEntry | null>`, `save(entry: FaqEntry): Promise<void>`,
  `delete(id: string): Promise<void>`. `TypeOrmFaqRepository` la implementa.

Sin test unitario para el repositorio TypeORM — no hay convención de
`.spec.ts` para repositorios en este proyecto (confirmado: ningún
`typeorm-*.repository.ts` tiene su `.spec.ts`). Se verifica corriendo la
migración contra la base real.

- [ ] **Step 1: Puerto del repositorio**

```ts
// apps/api/src/modules/faq/application/ports/faq.repository.port.ts
import { FaqEntry } from '../../domain/entities/faq-entry.entity';

export abstract class FaqRepositoryPort {
  abstract findAll(): Promise<FaqEntry[]>;
  abstract findById(id: string): Promise<FaqEntry | null>;
  abstract save(entry: FaqEntry): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
```

- [ ] **Step 2: Entidad ORM**

```ts
// apps/api/src/modules/faq/infrastructure/entities/faq-entry.orm-entity.ts
import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'faq_entries' })
export class FaqEntryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
```

- [ ] **Step 3: Repositorio TypeORM**

```ts
// apps/api/src/modules/faq/infrastructure/repositories/typeorm-faq.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FaqRepositoryPort } from '../../application/ports/faq.repository.port';
import { FaqEntry } from '../../domain/entities/faq-entry.entity';
import { FaqEntryOrmEntity } from '../entities/faq-entry.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmFaqRepository extends FaqRepositoryPort {
  private readonly repo: Repository<FaqEntryOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(FaqEntryOrmEntity);
  }

  async findAll(): Promise<FaqEntry[]> {
    const rows = await this.repo.find({ order: { createdAt: 'ASC' } });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<FaqEntry | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(entry: FaqEntry): Promise<void> {
    await this.repo.save({
      id: entry.id,
      question: entry.question,
      answer: entry.answer,
      createdAt: new Date(entry.createdAt),
      updatedAt: new Date(entry.updatedAt),
    });
  }

  async delete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  private toDomain(row: FaqEntryOrmEntity): FaqEntry {
    return new FaqEntry(
      row.id,
      row.question,
      row.answer,
      row.createdAt.toISOString(),
      row.updatedAt.toISOString(),
    );
  }
}
```

- [ ] **Step 4: Migración**

```ts
// apps/api/src/core/database/migrations/tenant/1700000000048-CreateFaqEntries.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFaqEntries1700000000048 implements MigrationInterface {
  name = 'CreateFaqEntries1700000000048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "faq_entries" (
        "id" uuid PRIMARY KEY,
        "question" text NOT NULL,
        "answer" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "faq_entries"`);
  }
}
```

Antes de escribir este archivo, correr `ls
apps/api/src/core/database/migrations/tenant/ | sort | tail -3` y
confirmar que `1700000000048` sigue siendo el próximo número libre — si
no lo es, usar el siguiente número libre real y ajustar el nombre de
archivo y el valor de `name`/la clase acorde.

- [ ] **Step 5: Registrar el módulo en `TENANT_MODULES`**

En `apps/api/src/core/database/tenant.datasource.ts`, agregar `'faq'` a
la lista `TENANT_MODULES` (es la que arma el glob de entidades ORM por
módulo — sin esto, `FaqEntryOrmEntity` nunca se registra en el DataSource
del tenant):

```ts
const TENANT_MODULES = [
  'identity',
  'academic',
  'enrollment',
  'attendance',
  'grading',
  'schedule',
  'finance',
  'hr',
  'documents',
  'communication',
  'survey',
  'library',
  'faq',
];
```

- [ ] **Step 6: Correr la migración contra la base de desarrollo y verificar**

Run: `pnpm --filter @eduapp/api migration:run:tenant:all`
Expected: sin errores; el log menciona el tenant `tenant_colegio_demo`.

Run (verificación directa, ajustar el puerto al de tu `DATABASE_URL`):
```bash
psql "$DATABASE_URL" -c "\d tenant_colegio_demo.faq_entries"
```
Expected: la tabla existe con las 6 columnas (`id`, `question`, `answer`,
`created_at`, `updated_at`, `deleted_at`).

- [ ] **Step 7: Compilar**

Run: `pnpm --filter @eduapp/api build`
Expected: build limpio.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/faq/application/ports/faq.repository.port.ts apps/api/src/modules/faq/infrastructure/entities/faq-entry.orm-entity.ts apps/api/src/modules/faq/infrastructure/repositories/typeorm-faq.repository.ts apps/api/src/core/database/migrations/tenant apps/api/src/core/database/tenant.datasource.ts
git commit -m "feat(faq): persistencia de faq_entries"
```

---

## Task 3: Use-cases CRUD — Create/Edit/Delete/List

**Files:**
- Create: `apps/api/src/modules/faq/application/use-cases/create-faq-entry.use-case.ts`
- Create: `apps/api/src/modules/faq/application/use-cases/create-faq-entry.use-case.spec.ts`
- Create: `apps/api/src/modules/faq/application/use-cases/edit-faq-entry.use-case.ts`
- Create: `apps/api/src/modules/faq/application/use-cases/edit-faq-entry.use-case.spec.ts`
- Create: `apps/api/src/modules/faq/application/use-cases/delete-faq-entry.use-case.ts`
- Create: `apps/api/src/modules/faq/application/use-cases/delete-faq-entry.use-case.spec.ts`
- Create: `apps/api/src/modules/faq/application/use-cases/list-faq-entries.use-case.ts`
- Create: `apps/api/src/modules/faq/application/use-cases/list-faq-entries.use-case.spec.ts`

**Interfaces:**
- Consumes: `FaqRepositoryPort` (Task 2), `FaqEntry` (Task 1).
- Produces: `CreateFaqEntryUseCase.execute(input: {question: string; answer: string}): Promise<FaqEntry>`,
  `EditFaqEntryUseCase.execute(id: string, input: {question: string; answer: string}): Promise<FaqEntry>`,
  `DeleteFaqEntryUseCase.execute(id: string): Promise<void>`,
  `ListFaqEntriesUseCase.execute(): Promise<FaqEntry[]>`.

- [ ] **Step 1: Escribir los tests que fallan (los 4 archivos)**

```ts
// create-faq-entry.use-case.spec.ts
import { CreateFaqEntryUseCase } from './create-faq-entry.use-case';
import { FaqRepositoryPort } from '../ports/faq.repository.port';

describe('CreateFaqEntryUseCase', () => {
  const faqEntries: jest.Mocked<FaqRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const useCase = new CreateFaqEntryUseCase(faqEntries);

  beforeEach(() => jest.clearAllMocks());

  it('crea y guarda una pregunta nueva', async () => {
    const result = await useCase.execute({
      question: '¿Cómo pido un certificado?',
      answer: 'En secretaría.',
    });

    expect(result.question).toBe('¿Cómo pido un certificado?');
    expect(result.answer).toBe('En secretaría.');
    expect(faqEntries.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza pregunta vacía', async () => {
    await expect(useCase.execute({ question: '   ', answer: 'En secretaría.' })).rejects.toThrow(
      'La pregunta no puede estar vacía',
    );
    expect(faqEntries.save).not.toHaveBeenCalled();
  });
});
```

```ts
// edit-faq-entry.use-case.spec.ts
import { NotFoundException } from '@nestjs/common';
import { EditFaqEntryUseCase } from './edit-faq-entry.use-case';
import { FaqRepositoryPort } from '../ports/faq.repository.port';
import { FaqEntry } from '../../domain/entities/faq-entry.entity';

describe('EditFaqEntryUseCase', () => {
  const faqEntries: jest.Mocked<FaqRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const useCase = new EditFaqEntryUseCase(faqEntries);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si la pregunta no existe', async () => {
    faqEntries.findById.mockResolvedValue(null);
    await expect(useCase.execute('faq-1', { question: 'a', answer: 'b' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('edita una pregunta existente', async () => {
    const entry = new FaqEntry(
      'faq-1',
      'vieja',
      'vieja resp',
      '2026-08-31T10:00:00.000Z',
      '2026-08-31T10:00:00.000Z',
    );
    faqEntries.findById.mockResolvedValue(entry);

    const result = await useCase.execute('faq-1', { question: 'nueva', answer: 'nueva resp' });

    expect(result.question).toBe('nueva');
    expect(result.answer).toBe('nueva resp');
    expect(faqEntries.save).toHaveBeenCalledWith(entry);
  });
});
```

```ts
// delete-faq-entry.use-case.spec.ts
import { NotFoundException } from '@nestjs/common';
import { DeleteFaqEntryUseCase } from './delete-faq-entry.use-case';
import { FaqRepositoryPort } from '../ports/faq.repository.port';
import { FaqEntry } from '../../domain/entities/faq-entry.entity';

describe('DeleteFaqEntryUseCase', () => {
  const faqEntries: jest.Mocked<FaqRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const useCase = new DeleteFaqEntryUseCase(faqEntries);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si la pregunta no existe', async () => {
    faqEntries.findById.mockResolvedValue(null);
    await expect(useCase.execute('faq-1')).rejects.toThrow(NotFoundException);
    expect(faqEntries.delete).not.toHaveBeenCalled();
  });

  it('elimina una pregunta existente', async () => {
    faqEntries.findById.mockResolvedValue(
      new FaqEntry('faq-1', 'pregunta', 'respuesta', '2026-08-31T10:00:00.000Z', '2026-08-31T10:00:00.000Z'),
    );

    await useCase.execute('faq-1');

    expect(faqEntries.delete).toHaveBeenCalledWith('faq-1');
  });
});
```

```ts
// list-faq-entries.use-case.spec.ts
import { ListFaqEntriesUseCase } from './list-faq-entries.use-case';
import { FaqRepositoryPort } from '../ports/faq.repository.port';
import { FaqEntry } from '../../domain/entities/faq-entry.entity';

describe('ListFaqEntriesUseCase', () => {
  const faqEntries: jest.Mocked<FaqRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const useCase = new ListFaqEntriesUseCase(faqEntries);

  it('devuelve todas las preguntas', async () => {
    const entries = [
      new FaqEntry('faq-1', 'p', 'r', '2026-08-31T10:00:00.000Z', '2026-08-31T10:00:00.000Z'),
    ];
    faqEntries.findAll.mockResolvedValue(entries);

    const result = await useCase.execute();

    expect(result).toBe(entries);
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `pnpm --filter @eduapp/api test -- faq/application/use-cases`
Expected: FAIL — ninguno de los 4 módulos existe todavía.

- [ ] **Step 3: Implementación**

```ts
// apps/api/src/modules/faq/application/use-cases/create-faq-entry.use-case.ts
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { FaqRepositoryPort } from '../ports/faq.repository.port';
import { FaqEntry } from '../../domain/entities/faq-entry.entity';

export interface CreateFaqEntryInput {
  question: string;
  answer: string;
}

@Injectable()
export class CreateFaqEntryUseCase {
  constructor(@Inject(FaqRepositoryPort) private readonly faqEntries: FaqRepositoryPort) {}

  async execute(input: CreateFaqEntryInput): Promise<FaqEntry> {
    const now = new Date().toISOString();
    const entry = new FaqEntry(randomUUID(), input.question, input.answer, now, now);
    await this.faqEntries.save(entry);
    return entry;
  }
}
```

```ts
// apps/api/src/modules/faq/application/use-cases/edit-faq-entry.use-case.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FaqRepositoryPort } from '../ports/faq.repository.port';
import { FaqEntry } from '../../domain/entities/faq-entry.entity';

export interface EditFaqEntryInput {
  question: string;
  answer: string;
}

@Injectable()
export class EditFaqEntryUseCase {
  constructor(@Inject(FaqRepositoryPort) private readonly faqEntries: FaqRepositoryPort) {}

  async execute(id: string, input: EditFaqEntryInput): Promise<FaqEntry> {
    const entry = await this.faqEntries.findById(id);
    if (!entry) {
      throw new NotFoundException(`No existe la pregunta "${id}"`);
    }
    entry.edit(input.question, input.answer);
    await this.faqEntries.save(entry);
    return entry;
  }
}
```

```ts
// apps/api/src/modules/faq/application/use-cases/delete-faq-entry.use-case.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FaqRepositoryPort } from '../ports/faq.repository.port';

@Injectable()
export class DeleteFaqEntryUseCase {
  constructor(@Inject(FaqRepositoryPort) private readonly faqEntries: FaqRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const entry = await this.faqEntries.findById(id);
    if (!entry) {
      throw new NotFoundException(`No existe la pregunta "${id}"`);
    }
    await this.faqEntries.delete(id);
  }
}
```

```ts
// apps/api/src/modules/faq/application/use-cases/list-faq-entries.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { FaqRepositoryPort } from '../ports/faq.repository.port';
import { FaqEntry } from '../../domain/entities/faq-entry.entity';

@Injectable()
export class ListFaqEntriesUseCase {
  constructor(@Inject(FaqRepositoryPort) private readonly faqEntries: FaqRepositoryPort) {}

  async execute(): Promise<FaqEntry[]> {
    return this.faqEntries.findAll();
  }
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `pnpm --filter @eduapp/api test -- faq/application/use-cases`
Expected: PASS (8 tests en total entre los 4 archivos).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/faq/application/use-cases/create-faq-entry.use-case.ts apps/api/src/modules/faq/application/use-cases/create-faq-entry.use-case.spec.ts apps/api/src/modules/faq/application/use-cases/edit-faq-entry.use-case.ts apps/api/src/modules/faq/application/use-cases/edit-faq-entry.use-case.spec.ts apps/api/src/modules/faq/application/use-cases/delete-faq-entry.use-case.ts apps/api/src/modules/faq/application/use-cases/delete-faq-entry.use-case.spec.ts apps/api/src/modules/faq/application/use-cases/list-faq-entries.use-case.ts apps/api/src/modules/faq/application/use-cases/list-faq-entries.use-case.spec.ts
git commit -m "feat(faq): use-cases de creación, edición, borrado y listado"
```

---

## Task 4: `SearchFaqEntriesUseCase`

**Files:**
- Create: `apps/api/src/modules/faq/application/use-cases/search-faq-entries.use-case.ts`
- Test: `apps/api/src/modules/faq/application/use-cases/search-faq-entries.use-case.spec.ts`

**Interfaces:**
- Consumes: `FaqRepositoryPort` (Task 2).
- Produces: `SearchFaqEntriesUseCase.execute(query: string): Promise<FaqEntry[]>`.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// search-faq-entries.use-case.spec.ts
import { SearchFaqEntriesUseCase } from './search-faq-entries.use-case';
import { FaqRepositoryPort } from '../ports/faq.repository.port';
import { FaqEntry } from '../../domain/entities/faq-entry.entity';

describe('SearchFaqEntriesUseCase', () => {
  const faqEntries: jest.Mocked<FaqRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const useCase = new SearchFaqEntriesUseCase(faqEntries);

  const certificado = new FaqEntry(
    'faq-1',
    '¿Cómo pido un certificado de alumno regular?',
    'Se solicita una constancia en secretaría con 48hs de anticipación.',
    '2026-08-31T10:00:00.000Z',
    '2026-08-31T10:00:00.000Z',
  );
  const horario = new FaqEntry(
    'faq-2',
    '¿Cuál es el horario de atención?',
    'Lunes a viernes de 8 a 16hs.',
    '2026-08-31T10:00:00.000Z',
    '2026-08-31T10:00:00.000Z',
  );

  beforeEach(() => jest.clearAllMocks());

  it('matchea por texto de la pregunta', async () => {
    faqEntries.findAll.mockResolvedValue([certificado, horario]);
    const result = await useCase.execute('certificado');
    expect(result).toEqual([certificado]);
  });

  it('matchea por texto de la respuesta', async () => {
    faqEntries.findAll.mockResolvedValue([certificado, horario]);
    const result = await useCase.execute('constancia');
    expect(result).toEqual([certificado]);
  });

  it('no distingue mayúsculas', async () => {
    faqEntries.findAll.mockResolvedValue([certificado, horario]);
    const result = await useCase.execute('CERTIFICADO');
    expect(result).toEqual([certificado]);
  });

  it('no distingue acentos', async () => {
    faqEntries.findAll.mockResolvedValue([certificado, horario]);
    const result = await useCase.execute('como pido'); // sin tilde, la pregunta real tiene "Cómo"
    expect(result).toEqual([certificado]);
  });

  it('query vacía devuelve un array vacío sin consultar el repositorio', async () => {
    const result = await useCase.execute('   ');
    expect(result).toEqual([]);
    expect(faqEntries.findAll).not.toHaveBeenCalled();
  });

  it('sin coincidencias devuelve un array vacío', async () => {
    faqEntries.findAll.mockResolvedValue([certificado, horario]);
    const result = await useCase.execute('inexistente');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `pnpm --filter @eduapp/api test -- search-faq-entries.use-case`
Expected: FAIL — no existe el módulo `./search-faq-entries.use-case`.

- [ ] **Step 3: Implementación**

```ts
// apps/api/src/modules/faq/application/use-cases/search-faq-entries.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { FaqRepositoryPort } from '../ports/faq.repository.port';
import { FaqEntry } from '../../domain/entities/faq-entry.entity';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

@Injectable()
export class SearchFaqEntriesUseCase {
  constructor(@Inject(FaqRepositoryPort) private readonly faqEntries: FaqRepositoryPort) {}

  async execute(query: string): Promise<FaqEntry[]> {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return [];

    const entries = await this.faqEntries.findAll();
    return entries.filter(
      (entry) =>
        normalize(entry.question).includes(normalizedQuery) ||
        normalize(entry.answer).includes(normalizedQuery),
    );
  }
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `pnpm --filter @eduapp/api test -- search-faq-entries.use-case`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/faq/application/use-cases/search-faq-entries.use-case.ts apps/api/src/modules/faq/application/use-cases/search-faq-entries.use-case.spec.ts
git commit -m "feat(faq): SearchFaqEntriesUseCase"
```

---

## Task 5: Permisos CASL — subject `Faq`

**Files:**
- Modify: `apps/api/src/core/auth/casl/ability.ts` (agregar `'Faq'` a `AppSubjects`)
- Modify: `apps/api/src/core/auth/casl/ability.factory.ts` (reglas de `Faq`)
- Modify: `apps/api/src/core/auth/casl/ability.factory.spec.ts` (test nuevo)

**Interfaces:**
- Produces: subject CASL `'Faq'` usable en `@CheckPolicies` (Task 6).

A diferencia del asistente de IA descartado (que no necesitaba subject
CASL nuevo porque era una restricción de instancia), esto SÍ es un
recurso normal de tipo manage/read, igual que `'Announcement'` o
`'Document'`.

- [ ] **Step 1: Agregar `'Faq'` al tipo `AppSubjects`**

En `apps/api/src/core/auth/casl/ability.ts`, agregar `| 'Faq'` a la unión
de `AppSubjects` (en cualquier posición de la lista, ej. después de
`'Loan'`):

```ts
export type AppSubjects =
  | 'AcademicYear'
  | 'Grade'
  | 'Section'
  | 'Subject'
  | 'User'
  | 'Enrollment'
  | 'Attendance'
  | 'Grading'
  | 'Schedule'
  | 'VirtualClass'
  | 'Finance'
  | 'Hr'
  | 'Document'
  | 'Announcement'
  | 'Event'
  | 'Message'
  | 'Survey'
  | 'SurveyResponse'
  | 'GuardianLink'
  | 'Book'
  | 'Loan'
  | 'Faq'
  | 'Report'
  | 'all';
```

- [ ] **Step 2: Agregar las reglas en `AbilityFactory`**

En `apps/api/src/core/auth/casl/ability.factory.ts`:

1. `admin_institucion` ya tiene `can('manage', 'all')` — no necesita cambios.
2. En el bloque de `directivo`, agregar `'Faq'` al array de `can('manage', [...])`:
```ts
    if (roles.includes('directivo')) {
      can('manage', [
        'AcademicYear',
        'Grade',
        'Section',
        'Subject',
        'User',
        'Enrollment',
        'Attendance',
        'Grading',
        'Schedule',
        'VirtualClass',
        'Finance',
        'Hr',
        'Document',
        'Announcement',
        'Event',
        'Message',
        'Survey',
        'SurveyResponse',
        'Book',
        'Loan',
        'Faq',
        'Report',
      ]);
      can('read', 'all');
    }
```
3. En el bloque de `secretaria`, agregar `'Faq'` a su array de
   `can('manage', [...])`:
```ts
    if (roles.includes('secretaria')) {
      can('manage', ['Finance', 'Hr', 'Document', 'Announcement', 'Event', 'Survey', 'Book', 'Loan', 'Faq']);
    }
```
4. En el bloque compartido de lectura (`docente`/`secretaria`/`estudiante`/`padre_tutor`),
   agregar `'Faq'` al array de `can('read', [...])` (mismo criterio que
   `'Announcement'`/`'Document'`: gestión exclusiva de admin/directivo/secretaria,
   lectura para todos):
```ts
    if (roles.some((role) => ['docente', 'secretaria', 'estudiante', 'padre_tutor'].includes(role))) {
      can('read', [
        'AcademicYear',
        'Grade',
        'Section',
        'Subject',
        'Enrollment',
        'User',
        'Attendance',
        'Grading',
        'Schedule',
        'VirtualClass',
        'Finance',
        'Document',
        'Announcement',
        'Event',
        'Survey',
        'Book',
        'Faq',
      ]);
      can('manage', ['Message', 'SurveyResponse']);
    }
```

- [ ] **Step 3: Test**

En `apps/api/src/core/auth/casl/ability.factory.spec.ts`, agregar (junto
al test existente de `'Announcement'`, mismo estilo):

```ts
it('secretaria puede manage Faq, docente/estudiante solo read', () => {
  expect(factory.createForUser(payload(['secretaria'])).can('create', 'Faq')).toBe(true);
  expect(factory.createForUser(payload(['docente'])).can('create', 'Faq')).toBe(false);
  expect(factory.createForUser(payload(['docente'])).can('read', 'Faq')).toBe(true);
  expect(factory.createForUser(payload(['estudiante'])).can('read', 'Faq')).toBe(true);
});
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `pnpm --filter @eduapp/api test -- ability.factory`
Expected: PASS (el test nuevo más todos los existentes, sin romper
ninguno).

- [ ] **Step 5: Compilar**

Run: `pnpm --filter @eduapp/api build`
Expected: build limpio.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/core/auth/casl/ability.ts apps/api/src/core/auth/casl/ability.factory.ts apps/api/src/core/auth/casl/ability.factory.spec.ts
git commit -m "feat(faq): subject CASL Faq y reglas de permisos"
```

---

## Task 6: Wiring del backend — DTOs, controller, módulo

**Files:**
- Create: `apps/api/src/modules/faq/interface/dtos/create-faq-entry.dto.ts`
- Create: `apps/api/src/modules/faq/interface/dtos/edit-faq-entry.dto.ts`
- Create: `apps/api/src/modules/faq/interface/controllers/faq.controller.ts`
- Create: `apps/api/src/modules/faq/faq.module.ts`
- Modify: `apps/api/src/app.module.ts` (importar `FaqModule`)

**Interfaces:**
- Consumes: todo lo de Tasks 1-5.
- Produces: `GET /faq`, `GET /faq/search?q=...` (sin `@CheckPolicies` —
  lectura abierta a cualquier usuario autenticado, solo el `JwtAuthGuard`
  global aplica), `POST /faq`, `PATCH /faq/:id`, `DELETE /faq/:id` (los
  tres con `@CheckPolicies` sobre el subject `'Faq'`).

- [ ] **Step 1: DTOs**

```ts
// apps/api/src/modules/faq/interface/dtos/create-faq-entry.dto.ts
import { IsString, MinLength } from 'class-validator';

export class CreateFaqEntryDto {
  @IsString()
  @MinLength(1)
  question: string;

  @IsString()
  @MinLength(1)
  answer: string;
}
```

```ts
// apps/api/src/modules/faq/interface/dtos/edit-faq-entry.dto.ts
import { IsString, MinLength } from 'class-validator';

export class EditFaqEntryDto {
  @IsString()
  @MinLength(1)
  question: string;

  @IsString()
  @MinLength(1)
  answer: string;
}
```

- [ ] **Step 2: Controller**

```ts
// apps/api/src/modules/faq/interface/controllers/faq.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateFaqEntryUseCase } from '../../application/use-cases/create-faq-entry.use-case';
import { EditFaqEntryUseCase } from '../../application/use-cases/edit-faq-entry.use-case';
import { DeleteFaqEntryUseCase } from '../../application/use-cases/delete-faq-entry.use-case';
import { ListFaqEntriesUseCase } from '../../application/use-cases/list-faq-entries.use-case';
import { SearchFaqEntriesUseCase } from '../../application/use-cases/search-faq-entries.use-case';
import { CreateFaqEntryDto } from '../dtos/create-faq-entry.dto';
import { EditFaqEntryDto } from '../dtos/edit-faq-entry.dto';

@Controller('faq')
export class FaqController {
  constructor(
    private readonly createFaqEntry: CreateFaqEntryUseCase,
    private readonly editFaqEntry: EditFaqEntryUseCase,
    private readonly deleteFaqEntry: DeleteFaqEntryUseCase,
    private readonly listFaqEntries: ListFaqEntriesUseCase,
    private readonly searchFaqEntries: SearchFaqEntriesUseCase,
  ) {}

  @Get()
  async list() {
    return this.listFaqEntries.execute();
  }

  @Get('search')
  async search(@Query('q') q: string) {
    return this.searchFaqEntries.execute(q ?? '');
  }

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Faq'))
  async create(@Body() dto: CreateFaqEntryDto) {
    return this.createFaqEntry.execute(dto);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'Faq'))
  async edit(@Param('id') id: string, @Body() dto: EditFaqEntryDto) {
    return this.editFaqEntry.execute(id, dto);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can('delete', 'Faq'))
  async remove(@Param('id') id: string) {
    await this.deleteFaqEntry.execute(id);
    return { ok: true };
  }
}
```

- [ ] **Step 3: Módulo**

```ts
// apps/api/src/modules/faq/faq.module.ts
import { Module } from '@nestjs/common';
import { FaqController } from './interface/controllers/faq.controller';
import { CreateFaqEntryUseCase } from './application/use-cases/create-faq-entry.use-case';
import { EditFaqEntryUseCase } from './application/use-cases/edit-faq-entry.use-case';
import { DeleteFaqEntryUseCase } from './application/use-cases/delete-faq-entry.use-case';
import { ListFaqEntriesUseCase } from './application/use-cases/list-faq-entries.use-case';
import { SearchFaqEntriesUseCase } from './application/use-cases/search-faq-entries.use-case';
import { FaqRepositoryPort } from './application/ports/faq.repository.port';
import { TypeOrmFaqRepository } from './infrastructure/repositories/typeorm-faq.repository';

@Module({
  controllers: [FaqController],
  providers: [
    CreateFaqEntryUseCase,
    EditFaqEntryUseCase,
    DeleteFaqEntryUseCase,
    ListFaqEntriesUseCase,
    SearchFaqEntriesUseCase,
    { provide: FaqRepositoryPort, useClass: TypeOrmFaqRepository },
  ],
})
export class FaqModule {}
```

- [ ] **Step 4: Registrar el módulo en `app.module.ts`**

Agregar el import:
```ts
import { FaqModule } from './modules/faq/faq.module';
```
Y agregar `FaqModule` a la lista de módulos importados (junto al resto).

- [ ] **Step 5: Compilar y correr toda la suite**

Run: `pnpm --filter @eduapp/api build && pnpm --filter @eduapp/api test`
Expected: build limpio, todos los tests en verde (incluidos los de las
Tasks 1, 3, 4 y 5).

- [ ] **Step 6: Verificación manual — curl**

Con la API corriendo (`pnpm --filter @eduapp/api dev`) y logueado como
cualquier usuario (para obtener un `access_token` real):
```bash
curl -X POST http://localhost:3001/faq \
  -H "content-type: application/json" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-subdomain: colegio-demo" \
  -d '{"question":"¿Cómo pido un certificado?","answer":"Se pide en secretaría."}'

curl "http://localhost:3001/faq/search?q=certificado" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-subdomain: colegio-demo"
```
Expected: el `POST` devuelve `201` con la pregunta creada (probar también
con un usuario `docente`: debe devolver `403 Forbidden`). El `GET
/faq/search` devuelve `200` con un array que incluye esa pregunta.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/faq/interface apps/api/src/modules/faq/faq.module.ts apps/api/src/app.module.ts
git commit -m "feat(faq): wiring del backend (dtos, controller, módulo)"
```

---

## Task 7: Frontend — capa de datos (tipo compartido, permisos, BFF, hooks)

**Files:**
- Modify: `packages/shared-types/src/index.ts` (agregar `FaqEntry`)
- Modify: `apps/web/src/lib/permissions.ts` (agregar `canManageFaq`)
- Create: `apps/web/src/app/api/faq/route.ts`
- Create: `apps/web/src/app/api/faq/search/route.ts`
- Create: `apps/web/src/app/api/faq/[id]/route.ts`
- Create: `apps/web/src/features/faq/use-faq.ts`

**Interfaces:**
- Produces: tipo `FaqEntry` (`id`, `question`, `answer`, `createdAt`, `updatedAt`, todos
  `string`); `canManageFaq(roles: string[]): boolean`; hooks
  `useFaqEntries()`, `useFaqSearch(query: string)`, `useCreateFaqEntry()`,
  `useEditFaqEntry()`, `useDeleteFaqEntry()` — consumidos por Tasks 8 y 9.

- [ ] **Step 1: Tipo compartido**

En `packages/shared-types/src/index.ts`, agregar al final:
```ts
export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Permiso de UI**

En `apps/web/src/lib/permissions.ts`, agregar:
```ts
/** Mismo criterio que canManageAnnouncements/canManageDocuments: gestionar preguntas frecuentes es tarea de secretaría. */
export function canManageFaq(roles: string[]): boolean {
  return (
    roles.includes('admin_institucion') || roles.includes('directivo') || roles.includes('secretaria')
  );
}
```

- [ ] **Step 3: Ruta BFF — `GET/POST /api/faq`**

```ts
// apps/web/src/app/api/faq/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { serverApiFetch } from '@/lib/server-api';
import type { FaqEntry } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET() {
  const entries = await serverApiFetch<FaqEntry[]>('/faq');
  if (entries === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const apiRes = await fetch(`${API_URL}/faq`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudo crear la pregunta';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const entry = (await apiRes.json()) as FaqEntry;
  return NextResponse.json(entry, { status: 201 });
}
```

- [ ] **Step 4: Ruta BFF — `GET /api/faq/search`**

```ts
// apps/web/src/app/api/faq/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { FaqEntry } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const entries = await serverApiFetch<FaqEntry[]>(`/faq/search?q=${encodeURIComponent(q)}`);
  if (entries === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(entries);
}
```

- [ ] **Step 5: Ruta BFF — `PATCH/DELETE /api/faq/[id]`**

```ts
// apps/web/src/app/api/faq/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { FaqEntry } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const apiRes = await fetch(`${API_URL}/faq/${params.id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudo editar la pregunta';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const entry = (await apiRes.json()) as FaqEntry;
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const apiRes = await fetch(`${API_URL}/faq/${params.id}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudo eliminar la pregunta';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Hooks de React Query**

```ts
// apps/web/src/features/faq/use-faq.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { FaqEntry } from '@eduapp/shared-types';

async function fetchFaqEntries(): Promise<FaqEntry[]> {
  const res = await fetch('/api/faq');
  if (!res.ok) throw new Error('No se pudieron cargar las preguntas frecuentes');
  return res.json();
}

async function searchFaqEntries(query: string): Promise<FaqEntry[]> {
  const res = await fetch(`/api/faq/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('No se pudo buscar');
  return res.json();
}

export interface CreateFaqEntryInput {
  question: string;
  answer: string;
}

async function createFaqEntry(input: CreateFaqEntryInput): Promise<FaqEntry> {
  const res = await fetch('/api/faq', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo crear la pregunta');
  }
  return res.json();
}

export interface EditFaqEntryInput {
  id: string;
  question: string;
  answer: string;
}

async function editFaqEntry({ id, ...input }: EditFaqEntryInput): Promise<FaqEntry> {
  const res = await fetch(`/api/faq/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo editar la pregunta');
  }
  return res.json();
}

async function deleteFaqEntry(id: string): Promise<void> {
  const res = await fetch(`/api/faq/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo eliminar la pregunta');
  }
}

export function useFaqEntries() {
  return useQuery({ queryKey: ['faq'], queryFn: fetchFaqEntries });
}

export function useFaqSearch(query: string) {
  return useQuery({
    queryKey: ['faq', 'search', query],
    queryFn: () => searchFaqEntries(query),
    enabled: query.trim().length > 0,
  });
}

export function useCreateFaqEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFaqEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq'] });
      toast.success('Pregunta creada.');
    },
  });
}

export function useEditFaqEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editFaqEntry,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faq'] }),
  });
}

export function useDeleteFaqEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFaqEntry,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faq'] }),
  });
}
```

- [ ] **Step 7: Build y lint**

Run: `pnpm --filter @eduapp/web build && pnpm --filter @eduapp/web lint`
Expected: ambos limpios.

- [ ] **Step 8: Commit**

```bash
git add packages/shared-types/src/index.ts apps/web/src/lib/permissions.ts apps/web/src/app/api/faq apps/web/src/features/faq/use-faq.ts
git commit -m "feat(faq): tipo compartido, permisos, BFF y hooks del frontend"
```

---

## Task 8: Frontend — página de administración

**Files:**
- Create: `apps/web/src/features/faq/components/faq-entry-form.tsx`
- Create: `apps/web/src/features/faq/components/faq-entries-list.tsx`
- Create: `apps/web/src/app/(dashboard)/faq/page.tsx`
- Modify: `apps/web/src/lib/nav-config.ts` (agregar el link "Preguntas frecuentes")

**Interfaces:**
- Consumes: `useFaqEntries`/`useCreateFaqEntry`/`useEditFaqEntry`/`useDeleteFaqEntry` (Task 7),
  `canManageFaq` (Task 7), componentes `Card`/`Button`/`Input`/`Label` de
  `apps/web/src/components/ui/`.

- [ ] **Step 1: Formulario de creación**

```tsx
// apps/web/src/features/faq/components/faq-entry-form.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useCreateFaqEntry } from '../use-faq';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FaqEntryForm() {
  const createFaqEntry = useCreateFaqEntry();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    createFaqEntry.mutate(
      { question, answer },
      {
        onSuccess: () => {
          setQuestion('');
          setAnswer('');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="question">Pregunta</Label>
        <Input
          id="question"
          placeholder="¿Cómo pido un certificado de alumno regular?"
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="answer">Respuesta</Label>
        <textarea
          id="answer"
          rows={3}
          required
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="flex w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <Button type="submit" disabled={createFaqEntry.isPending}>
        {createFaqEntry.isPending ? 'Creando...' : 'Crear pregunta'}
      </Button>
      {createFaqEntry.isError && <p className="text-sm text-destructive">{createFaqEntry.error.message}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Lista con edición y borrado**

```tsx
// apps/web/src/features/faq/components/faq-entries-list.tsx
'use client';

import { useState } from 'react';
import { useFaqEntries, useEditFaqEntry, useDeleteFaqEntry } from '../use-faq';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FaqEntry } from '@eduapp/shared-types';

export function FaqEntriesList({ canManage = false }: { canManage?: boolean }) {
  const { data: entries, isLoading, error } = useFaqEntries();
  const editFaqEntry = useEditFaqEntry();
  const deleteFaqEntry = useDeleteFaqEntry();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las preguntas.</p>;
  if (!entries || entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay preguntas cargadas.</p>;
  }

  function startEditing(entry: FaqEntry) {
    setEditingId(entry.id);
    setQuestion(entry.question);
    setAnswer(entry.answer);
  }

  function saveEdit(id: string) {
    if (!question.trim() || !answer.trim()) return;
    editFaqEntry.mutate({ id, question, answer }, { onSuccess: () => setEditingId(null) });
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => {
        const isEditing = editingId === entry.id;
        return (
          <Card key={entry.id} className="py-3">
            {isEditing ? (
              <div className="space-y-2">
                <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
                <textarea
                  rows={3}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="flex w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <div className="flex gap-2">
                  <Button type="button" disabled={editFaqEntry.isPending} onClick={() => saveEdit(entry.id)}>
                    Guardar
                  </Button>
                  <Button variant="ghost" type="button" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
                {editFaqEntry.isError && (
                  <p className="text-sm text-destructive">{editFaqEntry.error.message}</p>
                )}
              </div>
            ) : (
              <div>
                <p className="font-medium">{entry.question}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{entry.answer}</p>
                {canManage && (
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                      onClick={() => startEditing(entry)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-xs text-destructive underline"
                      disabled={deleteFaqEntry.isPending}
                      onClick={() => deleteFaqEntry.mutate(entry.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: Página**

```tsx
// apps/web/src/app/(dashboard)/faq/page.tsx
import { FaqEntryForm } from '@/features/faq/components/faq-entry-form';
import { FaqEntriesList } from '@/features/faq/components/faq-entries-list';
import { getCurrentUser } from '@/lib/server-api';
import { canManageFaq } from '@/lib/permissions';

export default async function FaqPage() {
  const user = await getCurrentUser();
  const canManage = canManageFaq(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Preguntas frecuentes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preguntas y respuestas institucionales que cualquier usuario puede buscar desde el widget flotante.
        </p>
      </div>

      {canManage && <FaqEntryForm />}
      <FaqEntriesList canManage={canManage} />
    </main>
  );
}
```

- [ ] **Step 4: Link en el menú lateral**

En `apps/web/src/lib/nav-config.ts`, agregar `HelpCircle` a la lista de
imports de `lucide-react`:
```ts
import {
  LayoutDashboard,
  CalendarRange,
  GraduationCap,
  LayoutGrid,
  BookOpen,
  Clock,
  ClipboardList,
  CheckSquare,
  BarChart3,
  Wallet,
  Briefcase,
  FileText,
  Users,
  Home,
  Megaphone,
  CalendarDays,
  MessageCircle,
  ListChecks,
  Library,
  PieChart,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
```
Y agregar la entrada al array `NAV_LINKS` (usando el grupo `ADMIN_SECRETARIA`
ya existente en ese archivo, mismo criterio que `Finanzas`/`RRHH`/`Documentos`):
```ts
  { href: '/faq', label: 'Preguntas frecuentes', icon: HelpCircle, roles: ADMIN_SECRETARIA },
```

- [ ] **Step 5: Build y lint**

Run: `pnpm --filter @eduapp/web build && pnpm --filter @eduapp/web lint`
Expected: ambos limpios.

- [ ] **Step 6: Verificación manual en navegador**

Con `pnpm --filter @eduapp/api dev` y `pnpm --filter @eduapp/web dev`
corriendo:
1. Loguearse como `admin_institucion` → confirmar que "Preguntas
   frecuentes" aparece en el menú lateral.
2. Ir a `/faq`, crear una pregunta ("¿Cómo pido un certificado?" / "Se
   pide en secretaría con 48hs de anticipación.") → confirmar que aparece
   en la lista.
3. Editarla y confirmar que el cambio se refleja.
4. Loguearse como `docente` → confirmar que "Preguntas frecuentes" NO
   aparece en el menú (fuera de alcance de este task probar el widget,
   eso es la Task 9).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/faq/components apps/web/src/app/\(dashboard\)/faq apps/web/src/lib/nav-config.ts
git commit -m "feat(faq): página de administración (crear/editar/eliminar)"
```

---

## Task 9: Frontend — widget flotante

**Files:**
- Create: `apps/web/src/features/faq/components/faq-widget.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx` (montar el widget, sin condicionar por rol)

**Interfaces:**
- Consumes: `useFaqSearch` (Task 7).
- Produces: `<FaqWidget />` — sin props, se autogestiona (búsqueda + resultados).

- [ ] **Step 1: Componente**

```tsx
// apps/web/src/features/faq/components/faq-widget.tsx
'use client';

import { useEffect, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { useFaqSearch } from '../use-faq';

export function FaqWidget() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: results, isLoading } = useFaqSearch(debouncedQuery);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col rounded border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium">Preguntas frecuentes</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar preguntas frecuentes"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="border-b border-border p-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscá una pregunta..."
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {!debouncedQuery.trim() && (
              <p className="text-sm text-muted-foreground">Escribí para buscar una pregunta.</p>
            )}
            {debouncedQuery.trim() && isLoading && (
              <p className="text-sm text-muted-foreground">Buscando...</p>
            )}
            {debouncedQuery.trim() && !isLoading && results?.length === 0 && (
              <p className="text-sm text-muted-foreground">No encontramos ninguna pregunta relacionada.</p>
            )}
            {results?.map((entry) => {
              const isExpanded = expandedId === entry.id;
              return (
                <div key={entry.id} className="rounded border border-border">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full px-3 py-2 text-left text-sm font-medium"
                  >
                    {entry.question}
                  </button>
                  {isExpanded && (
                    <p className="whitespace-pre-wrap border-t border-border px-3 py-2 text-sm text-muted-foreground">
                      {entry.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar preguntas frecuentes' : 'Abrir preguntas frecuentes'}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-background shadow-lg"
      >
        <HelpCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Montar el widget en el layout del dashboard**

En `apps/web/src/app/(dashboard)/layout.tsx`, importar:
```ts
import { FaqWidget } from '@/features/faq/components/faq-widget';
```

Y dentro del JSX, como hermano del `<div className="flex min-w-0 flex-1...">`
que envuelve el contenido principal (al mismo nivel que ese div, dentro
del contenedor raíz `<div className="flex min-h-screen">`) — **sin
condicionar por rol esta vez**, a diferencia de como se había diseñado
para el asistente de IA descartado:
```tsx
<FaqWidget />
```

- [ ] **Step 3: Build y lint**

Run: `pnpm --filter @eduapp/web build && pnpm --filter @eduapp/web lint`
Expected: ambos limpios.

- [ ] **Step 4: Verificación manual en navegador**

Con la API y el web corriendo, y al menos una pregunta ya cargada (Task
8, Step 6):
1. Loguearse con cualquier rol (probar específicamente con uno que NO
   gestiona preguntas, ej. `docente` o `estudiante`) → confirmar que la
   burbuja aparece igual (a diferencia del asistente de IA descartado, acá
   no hay gate de rol).
2. Abrir el widget, escribir parte del texto de la pregunta cargada (ej.
   "certificado") → confirmar que aparece en los resultados.
3. Escribir parte del texto de la **respuesta** (ej. "secretaría") →
   confirmar que también aparece (matchea contra `answer`, no solo
   `question`).
4. Escribir una palabra sin esa combinación de letras (ej. "xyz") →
   confirmar el mensaje "No encontramos ninguna pregunta relacionada."
5. Hacer click en una pregunta de los resultados → confirmar que expande
   la respuesta debajo.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/faq/components/faq-widget.tsx "apps/web/src/app/(dashboard)/layout.tsx"
git commit -m "feat(faq): widget flotante de búsqueda"
```
