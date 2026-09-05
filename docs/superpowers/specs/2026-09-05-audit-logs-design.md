# Módulo de logs de auditoría — diseño

**Fecha:** 2026-09-05
**Estado:** Aprobado en conversación, pendiente de plan de implementación.

## Motivación

Con las funciones de eliminar/inactivar/dar de baja agregadas en los módulos de
Usuarios, Años lectivos, Grados, Secciones y Matrícula, no existe hoy rastro de
quién ejecutó qué acción ni cuándo. Con `admin_institucion` y `directivo`
teniendo permisos solapados sobre casi todo el sistema (ver `AbilityFactory`),
un log de auditoría es la manera de responder "¿quién hizo esto?" después del
hecho.

## Alcance

- **Todas las escrituras** (POST/PATCH/DELETE) de todos los módulos, sin
  necesidad de instrumentar cada caso de uso.
- **Lecturas sensibles puntuales**, marcadas explícitamente:
  - `GET /finance/charges?enrollmentId=X` — solo cuando la consulta está
    acotada a un estudiante puntual (una consulta general de "todos los
    cargos" no cuenta).
  - `GET /users` — cada acceso al listado, sin acotar a un usuario individual
    (hoy no existe un endpoint de "ver un usuario específico"; auditar el
    listado completo es la aproximación acordada para esta primera versión).
- Fuera de alcance para esta versión: RRHH (legajos de empleados), retención/
  archivado de logs antiguos, exportación del log.

## Opciones consideradas

1. **Interceptor global + decorador de opt-in para lecturas** (elegida). Cero
   cambios en los ~50 casos de uso existentes; cobertura completa de
   escrituras desde el día uno.
2. **Instrumentación manual por caso de uso.** Más legible desde el día uno,
   pero toca decenas de archivos y cualquier caso de uso nuevo puede olvidar
   loguear.
3. **Triggers de Postgres.** Descartada: no identifica al actor sin plomería
   adicional por request, y no puede cubrir lecturas (un trigger solo ve
   escrituras).

## Diseño

### Modelo de datos

Tabla nueva `audit_logs`, por tenant (mismo esquema que el resto de las
tablas — no hay tabla compartida entre colegios):

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `actor_id` | uuid, nullable | `null` en rutas `@Public()` |
| `actor_email` | text, nullable | **snapshot al momento de la acción**, no un join al usuario actual |
| `actor_roles` | text[], nullable | snapshot, mismo criterio |
| `method` | text | `POST`/`PATCH`/`DELETE`/`GET` |
| `route` | text | patrón de ruta, ej. `/academic/sections/:id` |
| `resource_id` | text, nullable | el `:id` de la ruta, si existe |
| `status_code` | int | |
| `success` | boolean | derivado de `status_code < 400` |
| `kind` | text | `'write'` \| `'sensitive_read'` |
| `ip_address` | text, nullable | |
| `created_at` | timestamptz | |

Por qué snapshot y no join: si el actor cambia de email o de rol después, el
log debe seguir reflejando quién era en el momento de la acción, no su estado
actual.

### Interceptor

`AuditInterceptor` (nuevo, `apps/api/src/modules/audit/interface/audit.interceptor.ts`),
registrado globalmente vía `APP_INTERCEPTOR` — mismo mecanismo que ya usan
`JwtAuthGuard`/`PoliciesGuard` en `core/auth/auth.module.ts` (multi-provider
sobre el mismo token, ver `apps/api/src/core/auth/auth.module.ts`).

- POST/PATCH/DELETE → siempre se loguea (`kind: 'write'`), sin marcar nada.
- GET → se loguea solo si el handler tiene el decorador `@AuditRead()`
  (`SetMetadata`, mismo mecanismo que `@CheckPolicies`). El interceptor no
  decide semántica de negocio (ej. "¿trae `enrollmentId`?") — cada endpoint
  que usa `@AuditRead()` decide su propia condición antes de que la request
  llegue al interceptor, o el decorador acepta una función predicado
  `@AuditRead((query) => !!query.enrollmentId)` para el caso de Finanzas.
- Escribe el log de forma asíncrona (no bloquea la respuesta real). Si la
  escritura del log falla, se registra un `Logger.warn(...)` y la request
  original sigue su curso normal — un log de auditoría roto nunca debe tumbar
  una acción real.
- Actor: `request.user` (poblado por `JwtAuthGuard`, que corre antes que los
  interceptors en el ciclo de vida de Nest). `resource_id`: `request.params.id`
  si existe. `route`: `request.route?.path` (patrón crudo de Express).

### Backend — módulo `audit`

Estructura hexagonal igual al resto del proyecto:

- `domain/entities/audit-log.entity.ts` — clase de datos simple, sin
  invariantes de negocio (un log de auditoría es un hecho, no un agregado).
- `application/ports/audit-log.repository.port.ts` — `record(entry)`,
  `findAll(filter, pagination)`.
- `application/use-cases/record-audit-log.use-case.ts` — el interceptor llama
  a este caso de uso, no al puerto directamente (mismo patrón que el resto
  del proyecto).
- `application/use-cases/list-audit-logs.use-case.ts` — filtros: actor,
  prefijo de ruta/módulo, rango de fechas, `kind`; paginado (mismo patrón
  `PaginatedResult`/`normalizePagination` ya usado en Usuarios/Matrícula).
- `infrastructure/entities/audit-log.orm-entity.ts` +
  `infrastructure/repositories/typeorm-audit-log.repository.ts`.
- `interface/controllers/audit-logs.controller.ts` — `GET /audit-logs`.
- `interface/decorators/audit-read.decorator.ts` — el `@AuditRead()`.
- `audit.module.ts` — registra el interceptor vía `APP_INTERCEPTOR`.

Nuevo subject CASL `'AuditLog'` en `core/auth/casl/ability.ts`, agregado
**solo** al bloque `can('manage', [...])` de `admin_institucion` — no al de
`directivo` (mismo criterio ya aplicado en Usuarios: editar/inactivar
usuarios es solo para `admin_institucion`, ver
`apps/web/src/lib/permissions.ts:canEditUsers`).

### Frontend

- Nueva función `canViewAuditLogs(roles)` en `lib/permissions.ts` —
  `roles.includes('admin_institucion')` únicamente.
- Nueva página `/audit`, mismo patrón de lista+buscador+paginación que
  Usuarios/Matrícula (`useAuditLogs` con `keepPreviousData` desde el
  arranque — ya sabemos por qué).
- Cada fila muestra: actor (email + roles del momento), acción (traducida de
  `method`+`route` vía una tabla de traducción ruta→descripción legible,
  ampliable con el tiempo sin tocar el interceptor), fecha, resultado
  (éxito/error con badge de color).

### Testing

- Specs del interceptor: mock de `ExecutionContext`/`CallHandler` — escrituras
  siempre logueadas, GETs solo con `@AuditRead()`, un fallo al escribir el log
  no debe propagarse ni afectar la respuesta original.
- Specs de `ListAuditLogsUseCase`: filtros y paginación.
- Verificación en vivo end-to-end: ejecutar una acción real (ej. eliminar una
  sección), confirmar que aparece en `/audit`.

## Fuera de alcance (explícitamente, para esta versión)

- RRHH (legajos de empleados) como lectura sensible.
- Retención/archivado de logs antiguos.
- Exportación del log (CSV/PDF).
- Diff de valores (antes/después) en las escrituras — el log registra *que*
  algo cambió y quién lo hizo, no el contenido del cambio.
- Rechazos a nivel de guard (401/403/429): `JwtAuthGuard`, `PoliciesGuard` y
  `ThrottlerGuard` corren antes que cualquier interceptor, así que un intento
  no autenticado, sin permiso, o bloqueado por rate-limit nunca llega a
  `AuditInterceptor` y no queda logueado. Solo se audita `success: false`
  para fallas lanzadas desde dentro de la lógica del propio handler
  (400/404/409/etc.) — es una limitación conocida de esta versión, no un bug.
