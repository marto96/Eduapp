# Calificaciones ponderadas + boletín por estudiante — Diseño

## Contexto y objetivo

Hoy el módulo `grading` es de uso exclusivamente docente: un profesor crea
`Evaluation`s (materia+sección+año+periodo texto libre+tipo
examen/tarea/proyecto/otro) y carga `GradeScore`s (nota cruda por
evaluación) para toda su sección de una. No hay noción de categorías de
nota ponderadas, no hay vista por estudiante, no hay forma de buscar un
estudiante por nombre o documento, y no existe ningún cálculo de nota
acumulada entre periodos — el PDF de boletín actual
(`generate-report-card-pdf.use-case.ts`) solo lista notas crudas sin
ponderar.

El objetivo es construir un boletín por estudiante equivalente al de Q10
(competidor de referencia en Colombia, ver memoria de análisis
competitivo): notas por materia y periodo con nota acumulada, un esquema
de ponderación configurable (actividades/evaluación bimestral/disciplina),
un buscador de estudiantes por nombre/documento, y modales de
administración para consultar el detalle de una nota y para cargar una
nueva.

Como parte de esto, "Inasistencia por materia" requiere que la asistencia
deje de tomarse por sección/día y pase a tomarse por sesión de clase
(materia, vía horario) — es un cambio real al flujo de asistencia, no solo
al cálculo, así que este proyecto se entrega en dos fases.

## Alcance

**Fase 1 — Asistencia por materia.** Cambia la captura de asistencia de
"una planilla por sección/día" a "una planilla por horario (clase
concreta)/día". Habilita contar inasistencias por materia.

**Fase 2 — Notas ponderadas + boletín.** Categorías de nota configurables
con pesos parametrizables, periodos configurables por año lectivo,
boletín por estudiante con buscador, modal de detalle (desglose por
categoría) y modal de creación de nota.

Explícitamente fuera de alcance (decisiones tomadas durante el diseño):

- **Ponderación por grado o por materia.** Se decidió una sola
  configuración de pesos por colegio (no por grado/nivel ni por materia).
  Más simple de construir y administrar; ampliar a granularidad menor
  queda para si en el futuro se pide explícitamente.
- **Notas de recuperación ("R")** vistas en la imagen de referencia (ej.
  "3.10 R"). No se mencionó en el pedido — no se modela en esta v1.
  Cualquier nota se trata como definitiva.
- **Optimizar `generate-report-card-pdf.use-case.ts`.** Tiene un N+1 real
  hoy (un query de `scores.findAll` por estudiante en un loop) pero no se
  toca en este proyecto — el nuevo boletín por estudiante es un flujo de
  lectura distinto (uno a la vez, no toda la sección junta). Queda como
  candidato a una optimización aparte si hace falta.
- **Cache o tabla materializada de notas.** El dataset por estudiante es
  chico (≈15 materias × 4 periodos × pocas evaluaciones); se calcula al
  vuelo en cada request. Revisar esto solo si se pide un boletín masivo de
  toda una sección a la vez y resulta lento en la práctica.

## Fase 1 — Modelo de datos: asistencia por materia

### `AttendanceRecord` (existente, se modifica)

Se agrega `scheduleId: string | null` (referencia a `Schedule`: la clase
concreta materia+sección+día+hora). Los registros históricos previos a la
migración quedan con `scheduleId` nulo — no se migran retroactivamente,
simplemente no participan de los conteos por materia (que son hacia
adelante).

### `RecordAttendanceUseCase` (existente, cambia su input)

De `{ sectionId, academicYearId, date, records }` pasa a
`{ scheduleId, date, records }`. `sectionId`/`academicYearId` se derivan
del `Schedule` encontrado por `scheduleId` (vía `ScheduleRepositoryPort`).

Reglas nuevas:
- Si existe una `ClassCancellation` para ese `scheduleId`+`date`, se
  rechaza con 400 ("no se puede tomar asistencia de una clase cancelada").
- El chequeo de acceso se ajusta: un `docente` solo puede tomar asistencia
  de horarios donde él es el `teacherId` del `Schedule` (hoy
  `canTeacherAccessSection` solo valida que tenga *algún* horario en la
  sección, es más laxo de lo necesario). `admin_institucion`/`directivo`
  sin restricción, como hoy.

### Frontend (`TakeAttendanceForm`)

El selector "Sección" se reemplaza por un selector "Horario" (clase
concreta), filtrado por año lectivo y, si el usuario es `docente`, acotado
a sus propios horarios (reutilizando `teacher-sections.service.ts`, ya
existente). El resto del formulario (lista de estudiantes con estado por
cada uno) no cambia.

## Fase 2 — Modelo de datos

### `Período` (entidad nueva, módulo `academic`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `academicYearId` | uuid → `AcademicYear` | |
| `name` | string | Ej. "Primer periodo" |
| `order` | number | Para ordenar las columnas del boletín |
| `weight` | number (0-1) | Peso de este periodo en la Nota Acumulada |
| `startDate` / `endDate` | date | Rango de fechas del periodo — se usa para ubicar cada asistencia dentro de su periodo |

El colegio define cuántos periodos tiene el año y el peso de cada uno (no
tiene por qué ser 25% parejo). Se valida que la suma de pesos de todos los
periodos de un año lectivo no supere 100%; no se bloquea hasta que estén
todos cargados (se pueden ir creando de a uno).

### `GradeWeightConfig` (entidad nueva, una fila por colegio/tenant)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `actividadWeight` | number (0-1) | Default 0.65 |
| `evaluacionBimestralWeight` | number (0-1) | Default 0.25 |
| `disciplinaWeight` | number (0-1) | Default 0.10 |

Los tres deben sumar 1 (100%). La edita `admin_institucion`/`directivo`
desde una pantalla de configuración simple (get + update, no hace falta
un listado).

### `Evaluation` (existente, se modifica)

- `type: EvaluationType` (`'examen'|'tarea'|'proyecto'|'otro'`) se
  reemplaza por `category: GradeCategory`
  (`'actividad'|'evaluacion_bimestral'|'disciplina'`).
- `period: string` (texto libre) se reemplaza por `periodId: string`
  (referencia a `Período`).
- Se agrega `label: string | null` — etiqueta libre solo para mostrar
  dentro de la categoría "actividad" (ej. "Taller 1", "Quiz"), no afecta
  el cálculo. Opcional, sin usar en `evaluacion_bimestral`/`disciplina`
  (normalmente una sola evaluación por esas categorías, pero no se fuerza
  a nivel de datos).
- `maxScore` no cambia (cada evaluación puede seguir teniendo su propia
  escala — 10, 20, lo que sea).

### `GradeScore` (existente, sin cambios de esquema)

Sigue siendo `{ id, evaluationId, enrollmentId, score }`.

## Cálculos

Normalización: toda nota se lleva a escala 0.0–5.0 antes de combinarse:
`normalized = (score / maxScore) * 5`.

**Nota de una materia en un periodo** ("Nota", columna por periodo):

1. Si no existe ninguna `Evaluation` de esa materia en ese periodo →
   se muestra `"-"` (el periodo/materia todavía no arrancó).
2. Si existe al menos una: por cada categoría, se promedian las notas ya
   cargadas de esa categoría (solo evaluaciones con `GradeScore` para
   este estudiante). Si una categoría no tiene ninguna nota cargada
   todavía, se excluye del cálculo y su peso se redistribuye
   proporcionalmente entre las categorías que sí tienen datos (para
   mostrar progreso real en vez de castigar por algo que falta cargar).
3. Se marca `isPartial: true` si no las 3 categorías tienen datos —
   el frontend lo muestra como una marca visual chica (ej. un punto o
   tooltip "nota parcial"), sin cambiar el número.

**Nota Acumulada** (por materia, columna final): promedio ponderado de la
"Nota" de cada periodo configurado, usando el `weight` de cada `Período`.
Un periodo sin nota entra como 0 (a diferencia de la regla anterior — acá
no se redistribuye: es el cierre oficial y no puede inventar peso para un
periodo que no pasó).

**Inasistencia por periodo** (por materia): cuenta de `AttendanceRecord`
con `status = 'ausente'` de ese estudiante, en horarios (`Schedule`) de
esa materia+sección, con `date` dentro del rango `startDate`–`endDate` del
periodo. **Inasistencia Acumulada**: suma simple de los 4 (o los que
haya) periodos.

## API

- `POST/GET/PATCH /academic/periods` — CRUD de períodos por año lectivo.
- `GET/PATCH /grading/weight-config` — config de pesos (admin).
- `Evaluations` — mismo CRUD existente, DTOs actualizados a
  `category`+`periodId`+`label` en vez de `type`+`period`.
- `GET /grading/gradebook/students` — buscador: query params `search`
  (nombre o `documentNumber`), `academicYearId`, `page`/`pageSize` —
  mismo patrón dual-modo (bare array vs. envelope paginado) ya usado en
  `useUsers`/`useDocuments`. Devuelve
  `{ enrollmentId, studentId, fullName, documentNumber, sectionName }`.
- `GET /grading/gradebook/:enrollmentId` — boletín completo: por cada
  materia, por cada periodo, `{ grade, isPartial }` + inasistencia, más
  Nota/Inasistencia Acumulada. Calculado en el backend (no en el
  frontend) para no duplicar la lógica de pesos/redistribución.
- `GET /grading/gradebook/:enrollmentId/subject-period` (`subjectId` +
  `periodId`) — detalle para el modal de consulta: desglose por
  categoría (peso efectivo, promedio, evaluaciones individuales con su
  nota).
- `POST /grading/gradebook/:enrollmentId/grades` — crea una nota para un
  estudiante: `{ subjectId, sectionId, periodId, category,
  evaluationId? , label?, maxScore?, score }`. Si no se pasa
  `evaluationId`, crea la `Evaluation` (con `label`/`maxScore`) y el
  `GradeScore` en un solo paso — pensado para carga de a un estudiante
  desde administración, a diferencia del flujo docente actual
  (`RecordScoresUseCase`) que carga toda una sección de una.

Control de acceso: se reutilizan los roles ya definidos en
`canManageGrading` (admin/directivo/docente) — no se introduce ningún rol
nuevo. `admin_institucion`/`directivo` ya pueden operar sobre cualquier
sección (`canTeacherAccessSection` ya los deja pasar), así que "crear
notas desde administración" no requiere ningún cambio de permisos, solo
la nueva UI/endpoint.

## Frontend

Página `/grading` se amplía con una nueva sección "Boletín por
estudiante" (las secciones docentes existentes —Evaluaciones, Cargar
notas— no se tocan, siguen sirviendo para carga masiva por sección):

1. Buscador (nombre o documento) → lista de estudiantes → click en uno.
2. Tabla del boletín del estudiante elegido: materia × periodo, con Nota
   e Inasistencia por periodo, y Nota/Inasistencia Acumulada — igual
   diseño que la imagen de referencia.
3. Click en una celda con Nota ya calculada → abre `SubjectPeriodDetailModal`
   (solo lectura: desglose por categoría, evaluaciones individuales, con
   un botón "Agregar nota" que abre el modal de creación).
4. Click en el "+" de una celda vacía (sin evaluaciones aún) → abre
   directamente `CreateGradeModal`.
5. `CreateGradeModal`: elegir categoría, elegir una evaluación existente
   de esa materia/periodo/categoría o crear una nueva (label + maxScore),
   cargar el puntaje del estudiante. Al guardar, se cierra y se refresca
   el boletín.

`Período` y `GradeWeightConfig` se cachean del lado del cliente con React
Query (`staleTime` largo) — cambian pocas veces al año, no hace falta
refetchear en cada apertura de modal.

## Optimización

- Un solo query agregado por estudiante (todas las `Evaluation`+
  `GradeScore` de su `sectionId`+`academicYearId` de una vez, agrupado en
  memoria), no un query por materia/periodo.
- Sin cache ni tabla materializada por ahora (ver "Explícitamente fuera de
  alcance").
- Índices compuestos a agregar en la migración:
  `grade_scores(evaluation_id, enrollment_id)`,
  `evaluations(subject_id, section_id, academic_year_id, period_id, category)`,
  `attendance_records(schedule_id, date)`.

## Testing

- Backend: casos unitarios para el cálculo de Nota (con y sin
  redistribución), Nota Acumulada (con periodos faltantes), inasistencia
  por periodo. Casos de acceso: docente restringido a sus propios
  horarios en `RecordAttendanceUseCase`.
- Frontend: verificación manual en navegador (buscador, boletín, ambos
  modales) siguiendo la disciplina ya establecida en el resto del
  proyecto — no hay suite de tests de UI en este repo.
