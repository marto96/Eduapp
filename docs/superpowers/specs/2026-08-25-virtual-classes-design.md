# Clases virtuales (videollamadas embebidas) — Diseño

## Contexto

Hoy el módulo `schedule` (horarios) es una plantilla semanal recurrente: cada
`Schedule` representa un slot fijo (`sectionId`, `subjectId`, `teacherId`,
`academicYearId`, `dayOfWeek`, `startTime`, `endTime`), sin ningún concepto de
"ocurrencia" en una fecha concreta ni estado de sesión. No existe ninguna
funcionalidad de videollamada.

El usuario pidió evaluar la posibilidad de agregar videollamadas para clases
virtuales. Se investigó el módulo `schedule` existente (entidad, use-cases,
controller, CASL, frontend) y se definió con el usuario, vía preguntas
puntuales, el modelo a construir.

Decisiones ya confirmadas con el usuario:

- **Modelo de sala: una sala fija por horario**, no una entidad de sesión
  fechada. La sala de Jitsi se deriva de forma determinística del `scheduleId`
  y se reutiliza todas las semanas. Se descartó explícitamente la alternativa
  de una entidad `ClassSession` por fecha (más trabajo, permitiría
  grabación/asistencia por sesión más adelante, pero no es lo que se pidió
  ahora).
- **Cancelación puntual**: el profesor dueño del horario o un directivo/admin
  puede cancelar la clase de **una fecha concreta** sin afectar las demás
  semanas del mismo horario recurrente.
- **Compartir pantalla**: se usa el comportamiento nativo de Jitsi Meet
  (cualquier participante puede compartir pantalla por defecto desde la barra
  de herramientas). Restringirlo al dueño de la sesión requeriría moderación
  avanzada (JWT + roles) — **fuera de alcance de este diseño**, se deja como
  posible mejora futura si el usuario lo pide explícitamente.
- **Permisos**: docente dueño del horario + directivos pueden iniciar/cancelar
  la sala de sus propias clases (directivo, cualquiera). Secretaría,
  estudiantes y padres/tutores solo pueden ver el link y unirse.
- **Ubicación en frontend**: integrado directamente en la vista de Horarios
  existente (grid/lista), sin sección de navegación nueva.
- **Proveedor**: `meet.jit.si` (instancia pública gratuita de Jitsi Meet), sin
  self-host. Se abre en pestaña nueva (no iframe embebido), para evitar
  problemas de CSP dentro del BFF de Next.js.

## Fuera de alcance (v1)

- Grabación de la sesión.
- Sala de espera / lobby / autenticación JWT de Jitsi.
- Asistencia automática derivada de la videollamada (el módulo `attendance`
  sigue siendo manual, sin vínculo a `schedule` hoy — no se toca).
- Self-host de Jitsi (se usa la instancia pública).
- Restringir "compartir pantalla" al dueño de la sesión.
- Entidad `ClassSession` por fecha (queda como posible v2 si más adelante se
  quiere grabación/asistencia por sesión).

## Arquitectura

Todo se agrega dentro del módulo `schedule` existente (no se crea un módulo
nuevo — a diferencia del caso de `OverdueBalanceModule`, acá no hay un ciclo
de dependencias que evitar; `schedule` no necesita importar nada nuevo de
otro módulo).

### Modelo de datos

**`Schedule` (entidad existente, se extiende)**

Nuevo campo `isVirtual: boolean` (default `false`). Se agrega un método de
dominio `Schedule.setVirtual(isVirtual: boolean): void` siguiendo el patrón
ya establecido de métodos de comportamiento en las entidades (`Charge.
computeBalance()`, `FeeSchedule.updateAmount()`, `Enrollment.withdraw()`).

El nombre de sala de Jitsi **no se persiste**: se deriva determinísticamente
en el backend a partir de `scheduleId` (y el `tenantId`/schema activo, para
evitar colisiones entre tenants), p. ej.
`skolaria-<tenantSlug>-<scheduleId>`. Al no guardar el link no hay estado
adicional que sincronizar ni invalidar.

**`ClassCancellation` (entidad nueva)**

```ts
export class ClassCancellation {
  constructor(
    public readonly id: string,
    public readonly scheduleId: string,
    public readonly date: string, // 'YYYY-MM-DD'
    public readonly cancelledBy: string, // userId
    public readonly reason: string | null,
  ) {}
}
```

Tabla `class_cancellations`, migración
`apps/api/src/core/database/migrations/tenant/1700000000047-AddVirtualClassSupport.ts`
(próximo número libre tras `1700000000046-AddChargeUniquenessConstraints`):

```sql
ALTER TABLE "schedules" ADD COLUMN "is_virtual" boolean NOT NULL DEFAULT false;

CREATE TABLE "class_cancellations" (
  "id" uuid PRIMARY KEY,
  "schedule_id" uuid NOT NULL REFERENCES "schedules"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "cancelled_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "IDX_class_cancellations_schedule_date"
ON "class_cancellations" ("schedule_id", "date");
```

El índice único es el mismo patrón de "defensa en profundidad" ya usado para
matrícula/pensión: el use-case valida duplicado a nivel app, el índice es el
backstop ante condiciones de carrera, traducido a `ConflictException` vía
`isUniqueViolation` (ya existe en `postgres-error.util.ts`, agregado en la
feature de fee schedules).

### Puertos y use-cases nuevos

`apps/api/src/modules/schedule/application/ports/class-cancellation.repository.port.ts`:

```ts
export abstract class ClassCancellationRepositoryPort {
  abstract findOne(scheduleId: string, date: string): Promise<ClassCancellation | null>;
  abstract findByScheduleIds(scheduleIds: string[], from: string, to: string): Promise<ClassCancellation[]>;
  abstract save(cancellation: ClassCancellation): Promise<void>;
  abstract deleteById(id: string): Promise<void>;
}
```

`apps/api/src/modules/schedule/application/use-cases/`:

- `set-schedule-virtual.use-case.ts` — actor debe ser directivo/admin o el
  `teacherId` del `Schedule` (mismo chequeo de ownership que ya hace
  `CreateScheduleUseCase` para el profesor). Llama `schedule.setVirtual()` y
  guarda. Si no existe el `Schedule`, 404.
- `get-virtual-room.use-case.ts` — dado un `scheduleId`, valida que
  `isVirtual === true` (si no, 400/404 — "esta clase no tiene videollamada
  habilitada"), valida que el actor tenga `read` sobre `Schedule` para esa
  sección/rol (igual que hoy), y devuelve el nombre de sala derivado. No hay
  llamada a ninguna API externa de Jitsi — la derivación es pura.
- `cancel-class-session.use-case.ts` — valida ownership (docente dueño o
  directivo/admin), valida que `date` sea un día futuro o el día actual (no
  se cancelan clases pasadas) y que el `dayOfWeek` de esa fecha coincida con
  `schedule.dayOfWeek` (si no, 400 — "esa fecha no corresponde a este
  horario"), chequea duplicado vía `findOne`, guarda; `catch` en `save()`
  traduce `isUniqueViolation` a `ConflictException` (condición de carrera,
  backstop del índice).
- `uncancel-class-session.use-case.ts` — mismo chequeo de ownership, busca la
  cancelación por id, la borra. 404 si no existe.
- `list-class-cancellations.use-case.ts` — filtra por `sectionId` o
  `teacherId` + rango de fechas (para que el frontend sepa qué días de la
  grilla semanal están cancelados). Sigue el mismo patrón de filtrado que
  `ListSchedulesUseCase`.

### CASL

Nuevo subject `'VirtualClass'` en
`apps/api/src/core/auth/casl/ability.factory.ts`:

```ts
if (roles.includes('directivo')) {
  can('manage', [..., 'Schedule', 'VirtualClass', ...]);
}
if (roles.includes('docente')) {
  can('manage', 'VirtualClass'); // el use-case acota a "sus propios" horarios
}
if (roles.some(r => ['secretaria', 'estudiante', 'padre_tutor'].includes(r))) {
  can('read', [..., 'Schedule', 'VirtualClass', ...]);
}
```

Igual que con `Schedule` hoy, CASL solo autoriza a nivel de subject; el
ownership real ("¿es TU horario?") se valida dentro del use-case, replicando
el patrón ya usado en `CreateScheduleUseCase`.

### Controller

`apps/api/src/modules/schedule/interface/controllers/schedules.controller.ts`
(se extiende, no se crea uno nuevo):

- `PATCH /schedule/:id/virtual` — body `{ isVirtual: boolean }`,
  `@CheckPolicies(ability => ability.can('manage', 'VirtualClass'))`.
- `GET /schedule/:id/virtual-room` — sin body, devuelve `{ roomName: string }`
  o 404 si `isVirtual` es `false`.
- `POST /schedule/:id/cancellations` — body `{ date: string, reason?: string }`,
  `@CheckPolicies(ability => ability.can('manage', 'VirtualClass'))`.
- `DELETE /schedule/cancellations/:id` — mismo `@CheckPolicies`.
- `GET /schedule/cancellations` — query `sectionId`/`teacherId`/`from`/`to`,
  sin `@CheckPolicies` explícito (igual que `GET /schedule` hoy — lectura
  abierta a cualquier rol autenticado).

### Frontend

- `apps/web/src/features/schedule/use-schedules.ts` (se extiende): nuevos
  hooks `useSetScheduleVirtual`, `useVirtualRoom(scheduleId)`,
  `useClassCancellations(filters)`, `useCancelClassSession`,
  `useUncancelClassSession`. Mismo patrón de React Query + BFF ya usado en
  todo el resto del proyecto.
- Nuevas rutas BFF: `apps/web/src/app/api/schedule/[id]/virtual/route.ts`
  (PATCH), `apps/web/src/app/api/schedule/[id]/virtual-room/route.ts` (GET),
  `apps/web/src/app/api/schedule/[id]/cancellations/route.ts` (POST),
  `apps/web/src/app/api/schedule/cancellations/route.ts` (GET),
  `apps/web/src/app/api/schedule/cancellations/[id]/route.ts` (DELETE). Todas
  siguen el patrón ya corregido esta sesión (fetch directo + `message`/status
  reales, no `serverApiFetch`).
- `apps/web/src/features/schedule/components/schedule-grid.tsx` y
  `schedules-list.tsx` (se extienden): cada slot con `isVirtual === true`
  muestra:
  - Si no hay cancelación para la fecha correspondiente de esa semana: botón
    "Unirse" (abre `https://meet.jit.si/<roomName>` en pestaña nueva, vía
    `useVirtualRoom`) y, si el actor es el docente dueño o directivo, botón
    "Cancelar clase de hoy" (abre un diálogo con motivo opcional).
  - Si hay cancelación: badge "Cancelada" con el motivo en tooltip, y — para
    el mismo actor autorizado — acción "Revertir cancelación".
- Formulario de creación/edición de horario (`create-schedule-form.tsx` o el
  que corresponda): checkbox nuevo "Clase virtual" que llama
  `useSetScheduleVirtual` tras crear/al editar.

## Testing

- Backend: specs nuevos para `set-schedule-virtual`, `get-virtual-room`,
  `cancel-class-session` (incluyendo el chequeo de día-de-semana y el catch
  de `isUniqueViolation`), `uncancel-class-session`, `list-class-
  cancellations`. `pnpm --filter @eduapp/api test` y `build`.
- Migración: correr contra la base de dev
  (`pnpm migration:run:tenant:all`), confirmar la columna nueva y el índice
  único con `pg_indexes`; probar insertar dos cancelaciones para el mismo
  `(scheduleId, date)` y confirmar 409, no 500.
- Frontend: `pnpm --filter @eduapp/web build` y `lint`.
- En navegador: marcar un horario como virtual, confirmar que aparece
  "Unirse" y que abre una sala de Jitsi válida; cancelar la clase de hoy como
  docente dueño y confirmar que el botón cambia a "Cancelada"; intentar
  cancelar como un docente que no es dueño de ese horario → 403; revertir la
  cancelación; confirmar que un estudiante/padre solo ve "Unirse", nunca
  "Cancelar".
