# Chatbot de preguntas frecuentes (FAQ) — Diseño

## Contexto

El usuario había pedido originalmente un asistente de IA autoalojado (Ollama)
que consultara datos personales (cargos, notas, asistencia) de
estudiante/padre_tutor — ver `docs/superpowers/specs/2026-08-26-ai-assistant-design.md`
(descartado). Tras evaluar la complejidad de infraestructura que implicaba
(VPS, Docker, Ollama, un modelo corriendo por CPU), el usuario decidió
reemplazarlo por algo mucho más simple: un chatbot de **preguntas
frecuentes institucionales predeterminadas**, sin IA ni infraestructura
externa — administradores/directivos/secretaría cargan preguntas y
respuestas fijas, y cualquier usuario las busca por palabra clave.

Decisiones confirmadas con el usuario:

- **Audiencia**: todos los roles pueden **usar** el buscador (a diferencia
  del asistente anterior, esto es información institucional general, sin
  datos personales de nadie, así que no hay motivo para restringirlo).
- **Gestión**: `admin_institucion`, `directivo` y `secretaria` pueden
  crear/editar/borrar preguntas — mismo criterio de permisos que
  Comunicados y Documentos.
- **Búsqueda**: por palabra clave (substring, sin distinguir mayúsculas ni
  acentos) contra el texto de la **pregunta y la respuesta** — sin un
  campo de tags/keywords separado (YAGNI: la respuesta ya suele contener
  los sinónimos relevantes; se agrega un campo de tags más adelante si el
  uso real muestra que hace falta).
- **UI**: reemplaza el mismo widget flotante que se había diseñado para el
  asistente anterior (bubble abajo a la derecha) — ahora con un buscador
  en vez de un chat libre a un modelo.
- **Sin IA, sin LLM, sin infraestructura externa** — es un CRUD simple más
  un filtro en memoria.

## Fuera de alcance (v1)

- Full-text search de Postgres (`tsvector`/`pg_trgm`) — con el volumen
  esperado (decenas de preguntas por institución, no miles), un filtro en
  memoria por substring alcanza. Se reevalúa si el volumen crece mucho.
- Categorías/agrupación de preguntas (ej. "Matrícula", "Pagos") — se puede
  agregar después si la lista crece lo suficiente como para necesitarlo.
- Tags/keywords por pregunta — ver arriba.
- Analítica de qué preguntas se buscan más / preguntas sin resultados.
- Cualquier acción de escritura desde el widget — el buscador solo lee.

## Arquitectura

Todo vive dentro de la app existente, sin servicios nuevos:

```
Widget (Next.js, buscador) → BFF → GET /faq/search?q=... (NestJS)
Panel admin (Next.js, CRUD) → BFF → POST/PATCH/DELETE /faq, GET /faq
```

### Módulo nuevo: `faq`

Misma estructura que el resto de los módulos (domain/application/
infrastructure/interface).

**Dominio**: `FaqEntry`
```ts
export class FaqEntry {
  constructor(
    public readonly id: string,
    public question: string,
    public answer: string,
    public readonly createdAt: string,
    public updatedAt: string,
  ) {
    if (!question.trim()) throw new Error('La pregunta no puede estar vacía');
    if (!answer.trim()) throw new Error('La respuesta no puede estar vacía');
  }

  edit(question: string, answer: string): void {
    if (!question.trim()) throw new Error('La pregunta no puede estar vacía');
    if (!answer.trim()) throw new Error('La respuesta no puede estar vacía');
    this.question = question;
    this.answer = answer;
    this.updatedAt = new Date().toISOString();
  }
}
```

**Puerto**: `FaqRepositoryPort` con `findAll(): Promise<FaqEntry[]>`,
`findById(id): Promise<FaqEntry | null>`, `save(entry): Promise<void>`,
`delete(id): Promise<void>`.

**Use-cases**:
- `CreateFaqEntryUseCase.execute(input: {question, answer})` — valida y
  guarda.
- `EditFaqEntryUseCase.execute(id, input: {question, answer})` — busca,
  llama a `entry.edit(...)`, guarda; `NotFoundException` si no existe.
- `DeleteFaqEntryUseCase.execute(id)` — borra; `NotFoundException` si no
  existe.
- `ListFaqEntriesUseCase.execute(): Promise<FaqEntry[]>` — trae todas, sin
  filtro (para el panel de administración).
- `SearchFaqEntriesUseCase.execute(query: string): Promise<FaqEntry[]>` —
  trae todas vía `findAll()`, normaliza `query` (lowercase, sin acentos) y
  filtra en memoria las que tengan esa substring en `question` o `answer`
  (normalizados de la misma forma). Si `query` está vacío o es solo
  espacios, devuelve el array vacío (no tiene sentido "buscar nada" en el
  widget).

### Migración

`apps/api/src/core/database/migrations/tenant/<próximo-número>-CreateFaqEntries.ts`:
```sql
CREATE TABLE "faq_entries" (
  "id" uuid PRIMARY KEY,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
```
(El número exacto de migración se confirma al escribir el plan, contra el
estado real del repo en ese momento.)

### Controller

`apps/api/src/modules/faq/interface/controllers/faq.controller.ts`:
- `GET /faq` — sin `@CheckPolicies` (lectura abierta a cualquier usuario
  autenticado, igual que otros listados de lectura compartida en este
  proyecto) → `ListFaqEntriesUseCase`.
- `GET /faq/search?q=...` — mismo criterio de lectura abierta →
  `SearchFaqEntriesUseCase`.
- `POST /faq` — `@CheckPolicies(ability => ability.can('create', 'Faq'))`.
- `PATCH /faq/:id` — `@CheckPolicies(ability => ability.can('update', 'Faq'))`.
- `DELETE /faq/:id` — `@CheckPolicies(ability => ability.can('delete', 'Faq'))`.

### Permisos

A diferencia del asistente anterior, esto SÍ necesita un subject CASL
nuevo (`'Faq'`) porque es un recurso normal de tipo manage/read, no una
restricción de instancia como la del asistente. En
`apps/api/src/core/auth/casl/ability.factory.ts`, agregar:
- `admin_institucion`, `directivo`, `secretaria` → `manage('Faq')`.
- Todos los roles autenticados (`docente`, `estudiante`, `padre_tutor`,
  además de los de arriba) → `read('Faq')`.

### Frontend

- `apps/web/src/features/faq/components/faq-widget.tsx` — burbuja
  flotante (mismo lugar/posición que el diseño anterior), visible para
  **todos** los roles (sin gate de permisos como el asistente anterior).
  Al hacer click expande un panel: input de búsqueda (debounced ~300ms) +
  lista de preguntas que matchean; click en una pregunta expande/colapsa
  su respuesta debajo, sin ida y vuelta al servidor.
- `apps/web/src/features/faq/use-faq.ts` — `useFaqSearch(query)` (React
  Query, `enabled: query.trim().length > 0`) y, para el panel de admin,
  `useFaqEntries()`/`useCreateFaqEntry()`/`useEditFaqEntry()`/
  `useDeleteFaqEntry()`.
- Rutas BFF: `apps/web/src/app/api/faq/route.ts` (GET, POST),
  `apps/web/src/app/api/faq/search/route.ts` (GET),
  `apps/web/src/app/api/faq/[id]/route.ts` (PATCH, DELETE) — mismo patrón
  de fetch directo + `message`/status reales ya usado en el resto del
  proyecto.
- El widget se monta una sola vez en el layout del dashboard (sin
  condicionar por rol esta vez, a diferencia del asistente anterior).
- Nueva página `apps/web/src/app/(dashboard)/faq/page.tsx` en el menú
  lateral (visible solo si `canManageFaq(roles)`) con el CRUD de
  preguntas — mismo patrón de formulario + lista que Comunicados.

## Manejo de errores

- Búsqueda con 0 resultados: el widget muestra "No encontramos ninguna
  pregunta relacionada." — no es un error, es una respuesta válida.
- Crear/editar con pregunta o respuesta vacía: `BadRequestException` desde
  el dominio, mensaje real mostrado en el formulario (mismo patrón ya
  usado en el resto del proyecto, sin colapsar el error a un mensaje
  genérico).
- Sin rate limiting especial — es una consulta en memoria sobre una tabla
  chica, no hay costo de CPU que proteger (a diferencia del asistente con
  LLM).

## Testing

- Backend: specs para `FaqEntry` (validación de campos vacíos),
  `CreateFaqEntryUseCase`/`EditFaqEntryUseCase`/`DeleteFaqEntryUseCase`
  (casos felices + not-found), y `SearchFaqEntriesUseCase` (coincidencia
  en pregunta, coincidencia en respuesta, sin distinguir mayúsculas ni
  acentos, query vacía devuelve vacío, sin resultados devuelve vacío).
- Frontend: `pnpm --filter @eduapp/web build` y `lint`.
- En navegador: cargar 2-3 preguntas desde el panel de admin, abrir el
  widget como cualquier rol (incluido uno sin permisos de gestión, ej.
  docente) y confirmar que la búsqueda encuentra las preguntas cargadas
  tanto por texto de la pregunta como por texto de la respuesta.
