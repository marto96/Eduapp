# Modelado de aulas con detección de conflictos de horario — Diseño

**Contexto:** Gap identificado en el análisis competitivo vs. Q10 (`project_q10_competitive_analysis` memory) — el módulo de horarios (`apps/api/src/modules/schedule/`) ya detecta y bloquea el cruce de **docente** y de **sección** al crear un horario (`CreateScheduleUseCase`, reforzado con constraints `EXCLUDE USING gist` en Postgres), pero no existe ningún concepto de aula/salón físico en el sistema — ni en el dominio, ni en migraciones, ni en la UI. Dos secciones distintas pueden quedar asignadas a la misma aula física en el mismo horario sin que nada lo detecte.

**Objetivo:** Agregar un catálogo simple de aulas y una tercera dimensión de conflicto (aula) al mismo mecanismo de validación que ya existe para docente/sección — sin introducir abstracciones nuevas ni cambiar el flujo de creación de horarios más de lo estrictamente necesario.

## Alcance

Incluye:
1. Catálogo simple de aulas (`Classroom`): nombre + capacidad, sin edición ni desactivación (mismo nivel de funcionalidad que `Subject` hoy).
2. Campo `classroomId` opcional en `Schedule`.
3. Detección de conflicto de aula al crear un horario — mismo patrón estricto (bloqueo con 409) que ya usan docente y sección, reforzado con un tercer constraint `EXCLUDE USING gist` en Postgres.
4. UI: pantalla simple de alta/listado de aulas; select opcional de aula en el formulario de creación de horario; el nombre del aula se muestra en la grilla de horarios cuando está asignada.

Fuera de alcance (explícitamente no se construye en esta pasada):
- Estructura física (sedes/edificios/pisos) — un colegio con múltiples sedes queda fuera; si aparece esa necesidad, se extiende el catálogo entonces.
- Edición o desactivación de aulas — igual que `Subject`, que tampoco lo tiene hoy. Un aula creada por error se corrige a mano en la base o se deja inactiva de facto (sin usarla en horarios nuevos).
- Aula obligatoria — queda nullable; no hay backfill de horarios existentes ni bloqueo de horarios nuevos sin aula.
- Reserva de otros recursos (laboratorios, proyectores, equipos) como conceptos separados — YAGNI; si se pide, se generaliza a partir de este mismo mecanismo.

## Modelo de dominio

### `Classroom` (nueva, módulo `academic`)

```ts
// apps/api/src/modules/academic/domain/entities/classroom.entity.ts
export class Classroom {
  constructor(
    public readonly id: string,
    public name: string,
    public capacity: number,
  ) {
    if (capacity <= 0) {
      throw new Error('La capacidad debe ser mayor a cero');
    }
  }
}
```

Mirror exacto de `Subject` (`domain/entities/subject.entity.ts`): sin métodos de negocio, sin estado, solo estructura + validación de invariante en el constructor.

### `Schedule` (extensión)

`apps/api/src/modules/schedule/domain/entities/schedule.entity.ts` — agregar `public readonly classroomId: string | null = null` como último parámetro del constructor (después de `isVirtual`, que también tiene default — mantiene compatible cualquier llamado posicional existente que no lo pase). Sin cambios en `.overlaps()`: esa lógica sigue comparando solo rangos de tiempo; qué otro campo debe coincidir para que dos `Schedule` "compitan" por el mismo recurso lo decide quien llama a `.overlaps()` en el use-case, no la entidad.

## Validación de conflicto

`CreateScheduleUseCase` (`apps/api/src/modules/schedule/application/use-cases/create-schedule.use-case.ts`) ya resuelve los otros dos chequeos con `this.schedules.findAll(filter)` genérico (`ScheduleRepositoryPort.findAll(filter?: ScheduleFilter)`) más `.some(existing => existing.overlaps(schedule))` — no hay métodos dedicados por campo. `ScheduleFilter` gana `classroomId?: string`, y se agrega un tercer bloque idéntico en forma a los dos existentes:

```ts
if (input.classroomId) {
  const classroomSameDay = await this.schedules.findAll({
    classroomId: input.classroomId,
    academicYearId: input.academicYearId,
    dayOfWeek: input.dayOfWeek,
  });
  if (classroomSameDay.some((existing) => existing.overlaps(schedule))) {
    throw new ConflictException('El aula ya tiene otro horario asignado en ese rango');
  }
}
```

Se filtra también por `academicYearId`, igual que el chequeo de sección y a diferencia del de docente: un aula reutilizada el mismo día/rango horario en un año lectivo distinto no es un conflicto real (los años lectivos no coexisten en el calendario), mismo razonamiento que ya aplica hoy a `sectionId`. Si `classroomId` es `null`/omitido, se salta el bloque completo — coherente con "aula opcional". El `try/catch` que envuelve `this.schedules.save(schedule)` (líneas 67-79 hoy) no necesita cambios: ya captura *cualquier* violación de exclusión con `isExclusionViolation(err)` y la traduce a un único mensaje genérico ("El horario se superpone con otro ya existente") sin distinguir cuál de los constraints disparó — el nuevo constraint de aula cae en el mismo catch sin tocar código.

### Migración

Una sola migración nueva (`apps/api/src/core/database/migrations/tenant/`, siguiente número disponible en la secuencia `1700000000XXX`):
1. Crea tabla `classrooms` (`id uuid PK`, `name text NOT NULL`, `capacity integer NOT NULL`).
2. Agrega columna `classroom_id uuid NULL REFERENCES classrooms(id)` a `schedules`.
3. Agrega constraint de exclusión, mismo patrón exacto que `1700000000015-AddScheduleOverlapConstraint.ts` — reutiliza la misma expresión `int4range` calculada a mano desde `start_time`/`end_time` (`varchar "HH:mm"`, no hay columnas de minutos separadas; el cast a `timestamp` no sirve para un índice porque no es `IMMUTABLE`, ver el comentario de esa migración):

```sql
-- CREATE EXTENSION IF NOT EXISTS btree_gist ya existe desde la migración 1700000000015

ALTER TABLE "schedules" ADD CONSTRAINT "excl_schedules_classroom_overlap"
EXCLUDE USING gist (
  "classroom_id" WITH =,
  "academic_year_id" WITH =,
  "day_of_week" WITH =,
  int4range(
    (substring("start_time" from 1 for 2)::int * 60 + substring("start_time" from 4 for 2)::int),
    (substring("end_time" from 1 for 2)::int * 60 + substring("end_time" from 4 for 2)::int)
  ) WITH &&
) WHERE ("deleted_at" IS NULL AND "classroom_id" IS NOT NULL);
```

La condición `"classroom_id" IS NOT NULL` en el `WHERE` es necesaria y es la única diferencia real respecto a los dos constraints existentes: sin ella, dos horarios sin aula asignada (`classroom_id = NULL`) chocarían entre sí falsamente, porque un `EXCLUDE` no aplica la semántica SQL de "`NULL` nunca es igual a `NULL`" — a efectos del operador `=` de la constraint, dos `NULL` sí se consideran el mismo valor. Igual que los constraints existentes, actúa como defensa en profundidad contra la carrera read-then-write del use-case (se captura la violación y se traduce al mismo `ConflictException`).

## Backend

### `academic` — casos de uso nuevos

- `CreateClassroomUseCase` — mirror de `CreateSubjectUseCase`.
- `ListClassroomsUseCase` — mirror de `ListSubjectsUseCase`.
- Controller `ClassroomsController` (`academic/classrooms`, `GET`/`POST`) — mirror de `SubjectsController`, con `CheckPolicies((ability) => ability.can('create', 'Classroom'))` en el `POST`.
- `CreateClassroomDto` — `{ name: string, capacity: number }`, `@IsString() @MinLength(1)` / `@IsInt() @Min(1)`.

### `schedule` — cambios

- `CreateScheduleDto` gana `classroomId?: string` (`@IsOptional() @IsUUID()`).
- `ScheduleFilter` (`application/ports/schedule.repository.port.ts`) gana `classroomId?: string`; `TypeormScheduleRepository.findAll` agrega la cláusula `where` correspondiente cuando el filtro lo trae — mismo patrón que ya usa para `teacherId`/`sectionId`.

### CASL — reglas nuevas

En `apps/api/src/core/auth/casl/ability.ts`: agregar `'Classroom'` a `AppSubjects`.

En `apps/api/src/core/auth/casl/ability.factory.ts`:
- Bloque de `directivo` (línea ~31-55, `can('manage', [...])`): agregar `'Classroom'` junto a `'Grade'`/`'Subject'` — misma gestión académica. (`admin_institucion` ya cubierto por su `can('manage', 'all')` de la línea 19, sin cambio.)
- Bloque compartido de lectura docente/secretaria/estudiante/padre_tutor (línea ~97-115): agregar `'Classroom'` junto a `'Schedule'` — todos necesitan poder leer el nombre del aula para que se muestre en la grilla de horarios.
- `secretaria` NO gana `'Classroom'` en su bloque de `manage` propio (línea ~90) — mismo criterio que hoy con `'Schedule'`/`'Grade'`/`'Subject'`, que tampoco están ahí: la gestión de estructura académica queda para admin/directivo.

## Frontend

### Pantalla de aulas

Nueva pantalla simple bajo el mismo menú de configuración académica donde ya vive "Asignaturas": lista de aulas (nombre, capacidad) + formulario de alta. Calco de la pantalla de Asignaturas existente — mismo componente de lista, mismo patrón de formulario inline. Hook `use-classrooms.ts` (`apps/web/src/features/academic/`) con `useClassrooms()` (`GET academic/classrooms`) y `useCreateClassroom()`.

### Formulario de creación de horario (`create-schedule-form.tsx`)

Select opcional de aula, poblado desde `useClassrooms()`, placeholder "Sin aula asignada" (valor `''` → no se envía `classroomId` en el payload). Se ubica junto al select de docente, mismo estilo.

### Grilla de horarios (`schedule-grid.tsx`)

Si el horario tiene `classroomId`, se resuelve el nombre vía el mapa `classroomNameById` (mismo patrón ya establecido para grado/sección: `useClassrooms()` + `Map`) y se muestra como línea secundaria bajo la asignatura, ej. "Matemáticas — Aula 201". Si no tiene aula, no se muestra nada — no se fuerza el dato ni se muestra un placeholder tipo "Sin aula".

## Testing

- `classroom.entity.spec.ts` — validación de capacidad > 0 (trivial, mirror de cualquier entidad de catálogo con invariante).
- `create-classroom.use-case.spec.ts` / `list-classrooms.use-case.spec.ts` — mirror de los specs de `Subject`.
- Extensión de `create-schedule.use-case.spec.ts` con 2 casos nuevos:
  1. Dos horarios con el mismo `classroomId`, mismo día, rangos solapados → `ConflictException` con el mensaje de aula.
  2. Un horario sin `classroomId` (u otro con `classroomId` distinto) en el mismo rango → no lanza, se crea normalmente.
- Sin test de migración (ninguna migración del proyecto tiene test propio, se sigue la convención existente).
- Verificación en vivo: crear un aula, crear dos horarios en el mismo rango con la misma aula desde la UI y confirmar el bloqueo con el mensaje correcto; confirmar que el nombre del aula aparece en la grilla cuando corresponde.
