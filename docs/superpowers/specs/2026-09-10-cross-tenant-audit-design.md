# Auditoría cross-tenant desde el panel de superadmin — Diseño

## Contexto y objetivo

Ítem #3 de la hoja de ruta del superadmin (`docs/infra/2026-09-08-superadmin-roadmap.md`):
hoy `AuditLog` solo lo puede ver un admin *dentro* de su propio tenant
(`GET /audit-logs`, protegido por CASL). El superadmin necesita poder
investigar un reporte de un cliente sin tener que impersonar primero a
alguien de ese tenant.

**Objetivo:** que el superadmin, desde una página propia dentro del
detalle de un tenant, pueda ver y filtrar el audit log de ese tenant
(mismo buscador y paginación que ya existe del lado del tenant), y
exportarlo a CSV — todo de solo lectura, sin poder borrar ni modificar
nada.

## Decisiones acordadas (de la conversación de brainstorming)

- **Punto de entrada:** página propia (`/platform/tenants/:id/audit`),
  no una pestaña más dentro de la página principal del tenant.
- **Alcance de acciones:** solo lectura + exportar a CSV. Sin borrar,
  sin editar.
- **Auto-auditoría:** cada vez que el superadmin ve o exporta la
  auditoría de un tenant, esa acción queda registrada en el `audit_logs`
  de **ese mismo tenant** como lectura sensible (`kind: 'sensitive_read'`)
  — mismo criterio de trazabilidad que ya se aplica a crear/editar/
  impersonar usuarios.
- **Exportar:** CSV, con el filtro actual aplicado (búsqueda/tipo/fecha),
  ignorando la paginación de pantalla — si el filtro trae 340
  resultados repartidos en pantallas de 25, exporta las 340 filas en
  un archivo. Tope de seguridad: **10.000 filas** — si el filtro trae
  más, se exportan las primeras 10.000 (ordenadas igual que la vista,
  por fecha descendente) en vez de intentar traer todo sin límite.
- **Filtros:** los mismos que ya existe del lado del tenant — búsqueda
  por email de actor/ruta. **No se agregan filtros de tipo o rango de
  fecha en la UI** (el backend ya los soporta, pero el frontend del
  tenant nunca los expuso — se mantiene esa misma paridad acá, no se
  amplía).
- **`impersonatedBy`:** se descubrió que este campo (agregado en el
  plan de impersonación) nunca llegó al tipo compartido `AuditLog` en
  `shared-types`, ni a ninguna UI — ni siquiera la del propio tenant lo
  muestra. Para esta vista nueva del superadmin sí se agrega como un
  badge chico en cada fila cuando está presente ("vía impersonación")
  — es exactamente el contexto que un superadmin investigando un
  reporte necesita ver. La vista del tenant en sí **no se toca** (fuera
  de alcance de este spec).

## Arquitectura: mismo patrón que gestión de usuarios por tenant

Igual que con `PlatformListTenantUsersUseCase`, no hay lógica de
negocio nueva que escribir para el filtrado/paginación en sí — se abre
una conexión puntual al schema del tenant elegido
(`withTenantSchemaConnection`, ya existente) y ahí adentro se
instancia a mano `TypeOrmAuditLogRepository(dataSource)` para delegar
en el `ListAuditLogsUseCase` **ya existente** (el mismo que usa
`GET /audit-logs` del lado del tenant).

### Vista paginada

`PlatformListTenantAuditLogsUseCase.execute(tenantId, query, platformAdmin)`:
1. Resuelve el tenant vía `TenantRepositoryPort.findById` → 404 si no existe.
2. Abre la conexión puntual al schema.
3. Instancia `TypeOrmAuditLogRepository(dataSource)` y delega en
   `new ListAuditLogsUseCase(auditLogs).execute(query)` — mismo
   `ListAuditLogsQuery` (`search?`, `kind?`, `from?`, `to?`, `page?`,
   `pageSize?`) y misma forma de respuesta (`{items, total, page,
   pageSize}`) que ya devuelve el endpoint del tenant.
4. Registra la lectura como auditoría best-effort en el tenant
   afectado (`recordPlatformAudit(dataSource, 'view-audit-log',
   'AuditLog', null, platformAdmin, 'sensitive_read')` — sin
   `resourceId` puntual, porque es un listado, no un registro
   específico).
5. Devuelve el resultado.

### Exportar CSV

`PlatformExportTenantAuditLogsUseCase.execute(tenantId, filter,
platformAdmin): Promise<string>` (devuelve el CSV como texto):
1. Mismo paso 1-2 que arriba.
2. En vez de pasar por `ListAuditLogsUseCase` (que normaliza/limita la
   paginación para la pantalla), llama directo a
   `auditLogs.findAll(filter, { page: 1, pageSize: 10_000 })` — el
   mismo método del repositorio, sin el límite de página pensado para
   UI.
3. Convierte los `AuditLog[]` resultantes a CSV (columnas: fecha,
   email del actor, roles del actor, método, ruta, id de recurso,
   código de estado, éxito, tipo, ip, vía impersonación).
4. Registra la exportación como auditoría best-effort
   (`recordPlatformAudit(dataSource, 'export-audit-log', 'AuditLog',
   null, platformAdmin, 'sensitive_read')`).
5. Devuelve el CSV.

### Extensión mínima de `recordPlatformAudit`

Hoy graba todo con `kind: 'write'` fijo, con la firma
`recordPlatformAudit(dataSource, action, subject, resourceId,
platformAdmin)` (5 parámetros). Se le agrega un sexto parámetro
opcional `kind: AuditLogKind = 'write'` al final — los 6 usos que ya
existen (crear/editar/desactivar/reactivar/resetear/impersonar
usuario) no se tocan, todos siguen grabando `'write'` por default;
solo las dos llamadas nuevas de este spec pasan `'sensitive_read'`
explícito.

## Superficie nueva

**Backend:**
- `GET /platform/tenants/:tenantId/audit-logs` — vista paginada.
- `GET /platform/tenants/:tenantId/audit-logs/export` — descarga CSV
  (`Content-Type: text/csv`, `Content-Disposition: attachment`).
- Nuevo controlador `PlatformTenantAuditController`, mismo patrón de
  protección que el resto de plataforma (`@Public()` a nivel de clase
  + `@UseGuards(PlatformAdminGuard)`).
- `recordPlatformAudit` extendido con el parámetro `kind` opcional.
- `AuditLog` (shared-types) extendido con `impersonatedBy: string |
  null` — hoy ausente pese a existir en el backend desde el plan de
  impersonación.

**Frontend:**
- `apps/web/src/app/platform/tenants/[id]/audit/page.tsx` — página
  nueva.
- Link "Ver auditoría" agregado a `apps/web/src/app/platform/tenants/
  [id]/page.tsx`.
- `PlatformTenantAuditLogsList` — componente nuevo, paralelo al
  `AuditLogsList` del tenant (no compartido, mismo criterio ya usado
  con usuarios) — mismo buscador y paginación, más el badge de
  impersonación y el botón "Exportar CSV".
- Hook nuevo + 2 rutas BFF (listado + export) — el export dispara una
  descarga real de archivo en el navegador.

## No-objetivos (fuera de alcance de este spec)

- Filtros de tipo o rango de fecha en la UI (ni acá ni en la vista del
  tenant — el backend ya los soporta, no se expone en ningún frontend
  todavía).
- Borrar o modificar registros de auditoría — la vista es
  exclusivamente de lectura.
- Mostrar `impersonatedBy` en la vista de auditoría del propio tenant
  — solo en la vista nueva del superadmin.
- Exportar en un formato distinto a CSV.
- Streaming o paginación en la exportación misma — el tope de 10.000
  filas es la única salvaguarda; si en el futuro un tenant supera eso
  de forma rutinaria, se revisita.

## Testing

- Backend: tests unitarios para `PlatformListTenantAuditLogsUseCase`
  (rechaza tenant inexistente, delega correctamente en
  `ListAuditLogsUseCase`, audita la lectura) y
  `PlatformExportTenantAuditLogsUseCase` (rechaza tenant inexistente,
  llama a `findAll` con el tope de 10.000, arma el CSV con las
  columnas correctas, audita la exportación). Test para la extensión
  de `recordPlatformAudit` (el parámetro `kind` es opcional y
  default `'write'`).
- Frontend: sin framework de test en `apps/web` (igual que las
  features anteriores) — verificación manual en navegador: entrar a
  la auditoría de un tenant desde la página del superadmin, filtrar
  por búsqueda, confirmar que el badge de impersonación aparece en las
  filas que corresponden, exportar CSV y confirmar que el archivo
  descargado tiene las filas esperadas, y confirmar en la base que
  quedaron las dos entradas de auditoría (`view-audit-log` y
  `export-audit-log`) en el tenant investigado.
