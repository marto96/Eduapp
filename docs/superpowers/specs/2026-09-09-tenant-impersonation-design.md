# Impersonación de tenant desde el panel de superadmin — Diseño

## Contexto y objetivo

Hoy, si un superadmin necesita reproducir o depurar un problema que un
usuario de un colegio está reportando, no tiene forma de ver la
plataforma "desde adentro" del tenant sin pedirle la contraseña a ese
usuario. Este es el ítem #2 de la hoja de ruta del superadmin
(`docs/infra/2026-09-08-superadmin-roadmap.md`): "Impersonación
('entrar como')".

**Objetivo:** que un superadmin pueda, desde la pestaña "Usuarios" de
un tenant (construida en el plan anterior,
`docs/superpowers/plans/2026-09-08-platform-tenant-users-plan.md`),
entrar a la aplicación del tenant como si fuera un usuario específico
de ese tenant — con acceso de lectura y escritura completo, igual que
tendría ese usuario — sin necesitar su contraseña, con una sesión
corta que se puede cerrar explícitamente, y con cada acción hecha
durante la impersonación marcada en la auditoría del tenant.

## Decisiones ya acordadas (de la conversación de brainstorming)

- **Alcance:** cualquier usuario del tenant, sin restricción de rol.
- **Permisos durante la impersonación:** completos — lectura y
  escritura, igual que el usuario real.
- **Sesiones concurrentes:** la sesión de impersonación **coexiste**
  con cualquier sesión real que el usuario ya tenga abierta; no se
  revoca ni se toca. Razón: hoy el sistema ya permite múltiples
  sesiones concurrentes por usuario (no hay ningún mecanismo de "una
  sola sesión activa" en todo el backend — confirmado por inspección
  de `AuthenticateUserUseCase` y por búsqueda de
  `revokeAllTokens`/`invalidateAllSessions` en todo `apps/api/src`, sin
  resultados), y agregar una revocación en tiempo real de access
  tokens sería un cambio mucho más grande al sistema de auth completo,
  fuera de alcance de esta feature.
- **Duración:** corta (30-60 min), termina sola.
- **Indicador visual:** banner fijo arriba de toda la app del tenant,
  con botón "Salir" explícito.

## Arquitectura: intercambio de token vía handoff de un solo uso

El panel de superadmin y cada tenant viven en **subdominios/dominios
distintos** (ej. `app.eduapp.com` vs `santateresa.eduapp.com`), y la
resolución de tenant en producción se hace por el header `Host` real
de la request (`TenantResolutionMiddleware`, confirmado que
`TENANT_HEADER_OVERRIDE_ENABLED` está apagado en producción). Esto
significa que el backend de plataforma no puede simplemente "poner una
cookie" en el dominio del tenant — las cookies están scoped por
origen.

**Flujo:**

1. En `PlatformTenantUsersList` (componente ya existente de la feature
   anterior), cada fila de usuario tiene un botón nuevo "Entrar como".
2. Al hacer clic, el frontend llama a una ruta BFF de plataforma que
   dispara `POST /platform/tenants/:tenantId/users/:userId/impersonate`
   en el backend (protegido con `PlatformAdminGuard`, mismo patrón que
   el resto del controlador de usuarios por tenant).
3. El backend:
   - Resuelve el tenant vía `TenantRepositoryPort.findById(tenantId)`
     → 404 si no existe (mismo patrón que los 6 use-cases anteriores).
   - Abre una conexión puntual al schema del tenant vía
     `withTenantSchemaConnection` (helper ya existente de la feature
     anterior).
   - Busca el usuario vía `TypeOrmUserRepository.findById(userId)` →
     404 si no existe.
   - **Rechaza si `user.status !== 'active'`** (no tiene sentido
     impersonar a un usuario invitado-sin-confirmar o desactivado; si
     alguien necesita depurar la cuenta de un usuario suspendido, debe
     reactivarlo primero desde la misma pestaña de Usuarios — acción
     que ya queda auditada).
   - Construye un `JwtPayload` real de tenant: `{ sub: user.id, email:
     user.email, roles: user.roles, tenantId: tenant.id,
     impersonatedBy: platformAdmin.sub }` — el mismo formato que emite
     un login normal, más un campo nuevo.
   - Firma ese payload como access token con el mismo secreto que usa
     el login normal (`JWT_ACCESS_SECRET`), pero con una expiración
     propia y más corta, configurable vía una env var nueva
     `IMPERSONATION_SESSION_EXPIRES_IN` (default `45m`). **No se emite
     refresh token** — la sesión de impersonación no se puede renovar;
     si vence, hay que volver a pedirla desde el panel.
   - Guarda ese access token en Redis bajo un código de un solo uso
     (`impersonation:handoff:<código-random-uuid>`), con un TTL muy
     corto (30 segundos) — el JWT en sí nunca viaja en una URL ni queda
     en logs de acceso o historial del navegador.
   - Registra la acción en la auditoría del tenant (best-effort, mismo
     mecanismo `recordPlatformAudit` ya existente, acción
     `'impersonate'`).
   - Responde con `{ handoffUrl }`. No existe hoy en todo el código
     ningún lugar que construya la URL pública de un tenant a partir de
     su subdominio (se confirmó por búsqueda en `apps/api/src` — nunca
     se necesitó hasta ahora), así que esta feature agrega una env var
     nueva `TENANT_BASE_DOMAIN` (ej. `eduapp.com` en producción,
     `localhost:3000` en desarrollo — sin protocolo). La URL se arma
     así: si `tenant.customDomain` está seteado, se usa
     `https://${tenant.customDomain}/impersonate/consume?code=...`
     (o `http://` si `TENANT_BASE_DOMAIN` es un host local); si no,
     `https://${tenant.subdomain}.${TENANT_BASE_DOMAIN}/impersonate/consume?code=...`.
     En desarrollo local esto da `http://santateresa.localhost:3000/impersonate/consume?code=...`,
     consistente con cómo ya se accede manualmente a un tenant en este
     entorno (confirmado en la verificación manual del plan anterior).
4. El frontend de plataforma redirige el navegador a esa URL completa.
5. Una ruta nueva en el frontend del tenant
   (`apps/web/src/app/impersonate/consume/page.tsx` o un route handler
   equivalente) recibe el `code`, llama a un endpoint de backend nuevo
   `POST /auth/impersonate/consume` (`@Public()`, sin guard de tenant
   JWT ya que todavía no hay sesión) que:
   - Busca el código en Redis, lo borra inmediatamente (de un solo
     uso), y si no existe o ya venció responde 410 Gone con un mensaje
     claro ("El enlace de acceso venció, pedí uno nuevo desde el
     panel").
   - Si existe, devuelve el access token guardado.
6. La ruta BFF del tenant que consumió el código guarda ese access
   token en la cookie `access_token` (mismo mecanismo que ya usa el
   login normal del tenant en `apps/web/src/app/api/auth/login/route.ts`,
   sin `refresh_token` ya que no se emitió ninguno) y redirige a
   `/dashboard`.
7. De ahí en más, el superadmin navega la app del tenant exactamente
   como si fuera esa persona — ninguna otra parte del código del
   tenant necesita cambios para esto, porque `JwtAuthGuard`/
   `JwtStrategy` no distinguen un access token de impersonación de uno
   normal (mismo secreto, mismo formato, con un campo opcional extra
   que solo algunas partes puntuales del código leen).

## Auditoría

- **Extensión de `JwtPayload`** (`apps/api/src/core/auth/jwt-payload.interface.ts`):
  se agrega un campo opcional `impersonatedBy?: string` (el `sub` del
  `PlatformJwtPayload` del superadmin — un UUID de `platform_admins`).
  Es opcional para no romper ningún login normal existente, que nunca
  lo va a tener.
- **Nueva columna en `audit_logs`:** migración de tenant nueva
  (siguiente número disponible, `1700000000064-AddImpersonatedByToAuditLogs.ts`)
  que agrega `impersonated_by uuid NULL` a la tabla `audit_logs` de
  cada tenant. Se descarta deliberadamente la alternativa de
  "aprovechar" un campo existente como `actorRoles` para esto — es
  exactamente el mismo error de tipos que ya causó el bug del
  `actor_id` en el plan anterior (forzar un dato ajeno en una columna
  con un propósito distinto). Una columna dedicada, nula por defecto,
  es la opción limpia.
- `AuditLog` (entidad de dominio), `AuditLogOrmEntity`, y
  `TypeOrmAuditLogRepository.record(...)` se extienden para aceptar y
  persistir este campo opcional.
- `AuditInterceptor` (que ya lee `request.user: JwtPayload` para
  completar `actorId`/`actorEmail`/`actorRoles` en cada acción
  auditada) se extiende para leer también `request.user.impersonatedBy`
  y pasarlo al `record(...)`. `actorId`/`actorEmail` siguen siendo los
  del usuario real impersonado — así el historial de esa cuenta queda
  intacto y consistente con cualquier acción que ese usuario haga por
  su cuenta; `impersonated_by` es el dato adicional que aclara "pero
  esta acción puntual la hizo un superadmin operando en su nombre".
- La acción de **iniciar** la impersonación (paso 3 del flujo) también
  se audita en el tenant afectado, vía `recordPlatformAudit` (acción
  `'impersonate'`, sujeto `'User'`, `resourceId` = id del usuario
  impersonado) — mismo mecanismo que ya usan los 6 use-cases de la
  feature anterior.

## Indicador visual y salida

- `GET /auth/me` (`apps/api/src/modules/identity/interface/controllers/auth.controller.ts`)
  se extiende para incluir, cuando el JWT actual trae `impersonatedBy`:
  `impersonatedBy: string | null` y `tenantId: string` (este último no
  se devuelve hoy; se agrega para poder armar el link de vuelta al
  panel). Ambos salen directo del `JwtPayload` ya decodificado —no
  hace falta ninguna consulta extra a la base para el flag en sí.
- En el layout raíz de la app del tenant se agrega un banner fijo
  arriba, visible solo cuando `impersonatedBy` viene presente:
  **"Estás viendo esto como {fullName} — Salir"** (`fullName` ya lo
  devuelve `/auth/me` hoy).
- "Salir" ejecuta el mismo flujo que un logout normal (best-effort,
  mismo `LogoutUseCase`/ruta BFF de logout ya existentes — aunque al no
  haber refresh token que revocar, el llamado al backend puede no
  tener nada que revocar; el borrado de cookies del lado del cliente
  es lo que realmente termina la sesión) y redirige a
  `https://app.eduapp.com/platform/tenants/{tenantId}` — vuelve
  directo a la pestaña de Usuarios de donde salió.
- Si la sesión vence sola (a los ~45 minutos), no hay banner activo
  para mostrar el link de vuelta — el superadmin ve la pantalla de
  login normal del tenant y tiene que volver a entrar al panel
  manualmente. Caso borde aceptado: la vía principal de salida es
  siempre el botón "Salir".

## Superficie nueva (resumen)

**Backend:**
- `POST /platform/tenants/:tenantId/users/:userId/impersonate` — nuevo
  endpoint en `PlatformTenantUsersController` (o un controlador nuevo
  dedicado si el existente ya está creciendo mucho — se decide en el
  plan de implementación).
- `POST /auth/impersonate/consume` — nuevo endpoint público en
  `AuthController` (o un controlador nuevo), sin guard de tenant JWT.
- `JwtPayload.impersonatedBy?: string` — extensión de interfaz.
- `GET /auth/me` — extensión de respuesta (`impersonatedBy`,
  `tenantId`).
- Migración nueva: `impersonated_by uuid NULL` en `audit_logs`.
- `AuditLog`, `AuditLogOrmEntity`, `TypeOrmAuditLogRepository.record`,
  `AuditInterceptor` — extendidos para el campo nuevo.
- Env var nueva: `IMPERSONATION_SESSION_EXPIRES_IN` (default `45m`).
- Uso de Redis para el código de handoff de un solo uso (ya hay una
  conexión Redis existente en el proyecto, usada por
  `TenantRegistryService` y por el blacklist de refresh tokens).

**Frontend:**
- Botón "Entrar como" en `PlatformTenantUsersList` (feature anterior).
- Ruta BFF de plataforma nueva que dispara el endpoint de
  impersonación y devuelve la `handoffUrl` al cliente para redirigir.
- Ruta nueva en el frontend del tenant que consume el código de
  handoff (`/impersonate/consume`).
- `apps/web/src/middleware.ts` ya tiene una lista de rutas que
  omiten su chequeo normal de sesión (`isBypassedApiRoute`, usada hoy
  por `/api/auth/*`, `/api/platform/*`, etc.) — la ruta de consumo
  necesita agregarse a esa lista, ya que se accede sin sesión previa.
- Banner de impersonación en el layout raíz del tenant + botón
  "Salir".

## Limitación conocida: cookies compartidas por origen

Las cookies `access_token`/`refresh_token` son por dominio, no por
pestaña. Si en el mismo navegador ya hay una sesión real abierta en el
subdominio del tenant (ej. el superadmin la abrió antes para probar
algo) y en otra pestaña se consume un handoff de impersonación para
ESE MISMO subdominio, la cookie `access_token` se sobreescribe — la
pestaña con la sesión real empieza a usar, sin darse cuenta, el token
de impersonación en su próxima request. Esto es un caso borde de uso
del propio superadmin probando en su navegador (no afecta al usuario
real del colegio, que está en su propio dispositivo/navegador), y no
se resuelve en este spec — alcanza con no compartir navegador entre una
sesión de prueba propia y una impersonación activa del mismo tenant.

## No-objetivos (fuera de alcance de este spec)

- Restringir qué acciones puede hacer el superadmin durante la
  impersonación (se decidió que tiene los mismos permisos que el
  usuario real).
- Revocar o interrumpir la sesión real del usuario impersonado.
- Un mecanismo de "una sola sesión activa" general para el sistema
  (no existe hoy, y esta feature no lo introduce).
- Renovar la sesión de impersonación más allá de su expiración fija
  (no se emite refresh token).
- Resolver, desde la app del tenant, el nombre/email del superadmin
  que está impersonando (el banner solo necesita saber "esto es una
  impersonación", no quién específicamente la inició — para eso está
  la auditoría, consultable desde plataforma).

## Testing

- Backend: tests unitarios para el nuevo use-case de impersonación
  (rechaza tenant inexistente, rechaza usuario inexistente, rechaza
  usuario no activo, emite un payload con `impersonatedBy` correcto,
  no emite refresh token, registra el código en Redis con el TTL
  correcto) y para el endpoint de consumo (código válido devuelve el
  token y borra el código; código inexistente/vencido devuelve 410).
  Tests para la extensión de `AuditInterceptor`/`TypeOrmAuditLogRepository`
  (el campo `impersonated_by` se persiste cuando está presente, queda
  `NULL` cuando no).
- Frontend: sin framework de test en `apps/web` (igual que la feature
  anterior) — verificación manual en navegador: iniciar impersonación
  desde la pestaña de Usuarios, confirmar el banner y el `fullName`
  correcto, hacer una acción de escritura como el usuario impersonado
  y confirmar en la base que `audit_logs.impersonated_by` quedó
  seteado, cerrar con "Salir" y confirmar que vuelve al panel.
