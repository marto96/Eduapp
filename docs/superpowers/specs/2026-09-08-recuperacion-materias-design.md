# Recuperación de materias por periodo — diseño

**Fecha:** 2026-09-08
**Estado:** Aprobado en conversación, pendiente de plan de implementación.

## Motivación

Hoy no existe ningún concepto de "recuperación" en el sistema: `GradeScore`
solo guarda un puntaje por evaluación, y no hay ninguna nota mínima
aprobatoria configurada — un docente ve el promedio (0-5) de un estudiante
en una materia y decide "a ojo" si perdió o no. Cuando un estudiante
recupera una materia en un periodo, no hay dónde registrar ese hecho: el
promedio bajo sigue ahí para siempre, sin ninguna anotación.

Esto salió a la luz al rediseñar el boletín en PDF: el boletín de hoy
tampoco muestra la nota final por materia/periodo (solo lista evaluaciones
sueltas), así que agregar la anotación de "recuperada" requiere primero
agregar esa nota final — sin eso no hay dónde "colgar" la anotación.

## Alcance

- Una **nota mínima aprobatoria única para todo el colegio** (no por
  materia), configurable, con **3.0 por defecto**.
- Recuperación **por materia y periodo** (no por evaluación individual, no
  anual): si el promedio de una materia en un periodo queda por debajo de
  la mínima, se puede registrar una recuperación de ese periodo puntual.
- La nota de recuperación **reemplaza** la nota del periodo — no se
  muestran ambas, solo la nota final con la anotación "(Recuperada)".
- La nota de recuperación entra **tal cual** al cálculo del acumulado, sin
  tope ni ajuste.
- El boletín en PDF pasa a mostrar la **nota final por materia y
  periodo** (hoy ausente) además del detalle de evaluaciones que ya
  tiene — necesario para que la recuperación se vea en algún lado.
- Se registra desde el mismo lugar donde hoy se ve el detalle de una nota
  (`SubjectPeriodDetailModal`), con el mismo permiso que cargar notas.

**Fuera de alcance para esta versión:**
- Recuperación por evaluación individual o anual — se puede agregar después
  sin rediseñar lo de acá, son conceptos independientes.
- Tope de la nota de recuperación (ej. "nunca por encima del mínimo") — se
  decidió no ponerlo por ahora, el docente es responsable del número que
  carga.
- Notificación al estudiante/acudiente cuando se registra una recuperación
  — se puede sumar reusando el mismo patrón de `NotifyNewGradeService` si
  se pide más adelante.

## Diseño

### 1. Nota mínima aprobatoria — se agrega a `GradeWeightConfig`

`GradeWeightConfig` ya es la configuración única por tenant (pesos de
actividad/evaluación/disciplina, editable desde una sola pantalla). Se le
agrega un campo más, no una tabla nueva:

```ts
export class GradeWeightConfig {
  constructor(
    public readonly id: string,
    public actividadWeight: number,
    public evaluacionBimestralWeight: number,
    public disciplinaWeight: number,
    public minPassingGrade: number = 3.0,
  ) { ... }

  edit(actividadWeight: number, evaluacionBimestralWeight: number, disciplinaWeight: number, minPassingGrade: number): void {
    // misma validación de pesos que ya existe, + minPassingGrade > 0 && <= 5
  }
}
```

- Migración: `ALTER TABLE grade_weight_configs ADD COLUMN min_passing_grade real NOT NULL DEFAULT 3.0`.
- `GradeWeightConfigService.getOrCreateDefault()` crea con `3.0` si no existe fila.
- `EditGradeWeightConfigUseCase` + DTO + controlador + pantalla de frontend existente (`use-grade-weight-config.ts`) suman el campo nuevo — mismo flujo que los pesos, un campo más en el mismo formulario.

### 2. Entidad `GradeRecovery` (nueva)

```ts
export class GradeRecovery {
  constructor(
    public readonly id: string,
    public readonly enrollmentId: string,
    public readonly subjectId: string,
    public readonly periodId: string,
    public score: number,
    public readonly recordedAt: string,
  ) {}
}
```

- Migración nueva: tabla `grade_recoveries` con `UNIQUE (enrollment_id, subject_id, period_id)` — una sola recuperación vigente por combinación; registrar de nuevo actualiza la existente (mismo criterio que `GradeWeightConfig`, que también es "un solo registro que se edita").
- Puerto `GradeRecoveryRepositoryPort`: `findByKey(enrollmentId, subjectId, periodId)`, `findAll({ enrollmentId })` (para traer todas las de un estudiante en una sola consulta, igual que `GradeScoreRepositoryPort.findAll({ enrollmentId })`), `upsert(recovery)`.
- Quién registró la recuperación no se guarda en la entidad — igual que
  `GradeScore` no guarda quién calificó — queda en el registro de
  auditoría general (`AuditInterceptor`), que ya loguea todos los writes.

### 3. `RecordGradeRecoveryUseCase` (nuevo)

`apps/api/src/modules/grading/application/use-cases/record-grade-recovery.use-case.ts`:

- Input: `enrollmentId`, `subjectId`, `periodId`, `score`.
- Valida (mismo patrón que `RecordScoresUseCase`): el docente tiene acceso
  a esa sección (`EnrollmentAccessService`/`canTeacherAccessSection`), el
  periodo pertenece al año de la matrícula, `0 <= score <= 5`.
- Regla de negocio: calcula la nota actual del periodo (misma lógica que
  `GetSubjectPeriodDetailUseCase`) y si ya está en o por encima de la
  mínima, rechaza con `ConflictException` — "no tiene sentido recuperar
  algo que no está perdido".
- Guarda vía `GradeRecoveryRepositoryPort.upsert(...)`.
- Expuesto en `ScoresController` (o un endpoint nuevo en el mismo
  controlador de calificaciones) como `POST
  /grading/subjects/:subjectId/periods/:periodId/recovery` con body
  `{ enrollmentId, score }`, mismo `@CheckPolicies(ability.can('manage', 'Grading'))` que ya protege cargar notas.

### 4. Aplicar la recuperación donde se calcula la nota

Dos lugares calculan hoy la nota de un periodo con
`GradeCalculationService.computeSubjectPeriodGrade` — ambos se ajustan
igual, para que **nunca haya dos pantallas mostrando cosas distintas**:

**`GetGradebookUseCase`** (usado por el gradebook del docente Y por la
vista de Calificaciones del estudiante/acudiente — es el mismo componente
`GradebookTable` en ambos):
- Trae también `this.recoveries.findAll({ enrollmentId })`.
- Arma un mapa `${subjectId}:${periodId} -> GradeRecovery`.
- Al construir cada `GradebookPeriodCell`: si hay recuperación para esa
  combinación, `grade = recovery.score`, `isPartial = false`,
  `isRecovered = true` (campo nuevo en la interfaz). Si no, queda igual
  que hoy con `isRecovered: false`.

**`GetSubjectPeriodDetailUseCase`** (el modal de detalle):
- Mismo reemplazo de `grade`/`isPartial`, más un `isRecovered: boolean` y
  el `minPassingGrade` (viene de `weights`, que el use-case ya carga) en
  la respuesta — el frontend los necesita para decidir si mostrar el botón
  de "Registrar recuperación".

### 5. Frontend

**`SubjectPeriodDetailModal`**: cuando `!readOnly && detail.grade !== null
&& detail.grade < detail.minPassingGrade && !detail.isRecovered`, se
muestra un formulario "Registrar recuperación" (un input numérico + botón)
debajo del detalle por categorías, en vez de (o junto a) "Agregar nota".
Si `detail.isRecovered`, se muestra la anotación en vez del formulario:
"Recuperada — nota registrada: X".

**`GradebookTable`**: la celda de una nota recuperada se distingue
visualmente (ej. un badge o ícono junto al número, con `title="Nota
recuperada"`) — mismo lugar donde hoy se marca `isPartial` con un punto.

### 6. Boletín en PDF

`GenerateReportCardPdfUseCase` deja de armar sus propias filas planas por
evaluación consultando los repositorios directo, y en su lugar **llama a
`GetGradebookUseCase.execute(enrollment.id, currentUser)` por cada
estudiante** — reusa exactamente el mismo cálculo (incluida la
recuperación) en vez de duplicarlo. Esto requiere:

- Agregar `@CurrentUser() currentUser: JwtPayload` a la ruta `GET
  /reports/grading/report-card.pdf` en `reports.controller.ts` (hoy no lo
  recibe) y pasarlo al use-case.
- **Efecto secundario intencional:** `GetGradebookUseCase` aplica
  `EnrollmentAccessService.resolveAccessibleEnrollmentIds` (un docente
  solo ve sus propias secciones) — hoy `GenerateReportCardPdfUseCase` no
  tiene ese chequeo por matrícula, solo el permiso general `manage
  Grading`. Con este cambio, un docente que intente generar el boletín de
  una sección que no le corresponde recibe `ForbiddenException` en vez de
  generarlo — se documenta como corrección de un hueco existente, no como
  detalle menor.

El PDF, por materia y periodo, pasa a mostrar:

```
Matemática — Primer periodo          Nota final: 3.2
  Actividad          4/5
  Actividad          3/5
  Evaluación bimestral   2/5
```

y si el periodo fue recuperado:

```
Matemática — Primer periodo          Nota final: 3.5 (Recuperada)
  Actividad          4/5           ← detalle original, se mantiene visible
  ...
```

El detalle de evaluaciones sueltas (lo que ya existía) se mantiene debajo
de la nota final como información de respaldo — no se quita nada de lo que
ya hay, se agrega la nota final que faltaba.

## Casos límite

- **Se edita una evaluación de un periodo ya recuperado:** la nota de
  recuperación sigue mandando (no se recalcula ni se borra sola) — si el
  docente quiere que el cambio se refleje, tiene que volver a registrar la
  recuperación. Se documenta así para la próxima versión; no se agrega
  ninguna invalidación automática ahora.
- **Se intenta recuperar un periodo que ya está aprobado:** rechazado con
  `ConflictException`.
- **Se intenta recuperar dos veces la misma materia/periodo:** la segunda
  llamada actualiza (upsert), no crea un duplicado ni falla.
- **Nota de recuperación fuera de rango (negativa o > 5):** rechazada con
  `BadRequestException`, mismo criterio que `RecordScoresUseCase` con el
  rango de una nota normal.
- **Un colegio nunca configuró `minPassingGrade`:** `3.0` por defecto,
  igual que los pesos ya tienen sus defaults al crear la fila la primera
  vez.

## Testing

- `GradeWeightConfig` (entidad): validación de `minPassingGrade` (rango
  válido), igual que ya se prueban los pesos.
- `RecordGradeRecoveryUseCase`: acceso de docente a la sección, rechazo si
  ya está aprobado, rechazo por nota fuera de rango, upsert sobre una
  recuperación existente.
- `GetGradebookUseCase`: con recuperación → `isRecovered: true` y `grade`
  reemplazado; sin recuperación → comportamiento idéntico al actual
  (regresión).
- `GetSubjectPeriodDetailUseCase`: mismo reemplazo, más `minPassingGrade`
  expuesto correctamente.
- `GenerateReportCardPdfUseCase`: ahora delega en `GetGradebookUseCase` —
  test de que arma las filas del PDF a partir de esa respuesta (incluida
  la anotación de recuperada), y que un docente sin acceso a la sección
  recibe `ForbiddenException`.
