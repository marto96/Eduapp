# Gestión de usuarios por tenant desde el panel de superadmin — diseño

**Fecha:** 2026-09-08
**Estado:** Aprobado en conversación, pendiente de plan de implementación.

## Motivación

Hoy el panel de plataforma (`/platform/*`, autenticado como `PlatformAdmin`,
un realm completamente separado del de los usuarios de un tenant — JWT
propio, secret propio, sin `tenantId`) solo gestiona metadata de
instituciones: nombre, subdominio, dominio propio, color de marca, logo,
módulos habilitados. No puede tocar nada dentro del schema de un tenant.

Esto genera un bloqueo real: `CreateTenantUseCase` crea el tenant y migra
su schema, pero no crea ningún usuario. Como `POST /users` exige ya estar
autenticado *dentro* de ese tenant con permiso CASL `create User`, un
tenant recién creado queda sin nadie que pueda loguearse — hoy la única
forma de destrabarlo es un insert manual en la base.

Es la primera vez que un `PlatformAdmin` necesita leer/escribir dentro del
schema de un tenant para algo más que aprovisionarlo. Se trata como
capacidad nueva, no como ajuste a lo que ya existe.

**Contexto de uso:** solo una persona usa `/platform` hoy (el equipo de
EduApp), ningún tenant tiene ni tendrá acceso a este perfil. Es el primer
punto de una hoja de ruta más larga para el panel de superadmin (ver
`docs/infra/2026-09-08-superadmin-roadmap.md`).

## Alcance

- El superadmin, desde `/platform/tenants/:id`, puede **crear, editar,
  desactivar, reactivar y resetear la contraseña** de usuarios de **ese**
  tenant — paridad completa con lo que ya puede hacer un `admin_institucion`
  sobre usuarios de su propio tenant.
- El listado es **por tenant, no cross-tenant**: se elige un tenant primero
  (ya existe ese patrón con el selector de instituciones) y se ven sus
  usuarios. Explícitamente descartado un listado global que junte usuarios
  de todos los tenants a la vez.
- Cero lógica de negocio duplicada: se reusan los mismos use-cases de
  `identity` que ya validan email único, documento único, fecha de
  nacimiento, auto-protección contra desactivarse a uno mismo, etc.
- Cada acción queda registrada en el `audit_logs` del tenant afectado,
  identificando que la hizo un superadmin de plataforma (no un usuario de
  ese tenant).

**Fuera de alcance para esta versión** (quedan en la hoja de ruta):

- Impersonación real (login como el tenant, redirigido al dashboard
  operativo) — punto 2 de la hoja de ruta. Esto no la reemplaza ni la
  adelanta: acá el superadmin nunca "entra" al tenant, solo gestiona sus
  usuarios desde el panel de plataforma.
- Una pantalla que muestre auditoría cross-tenant — punto 3 de la hoja de
  ruta. Acá solo se **escribe** el registro; verlo agregado entre tenants
  es trabajo futuro.
- Tocar `CreateTenantUseCase` o el formulario de crear institución — ver
  más abajo por qué no hace falta.

## Diseño

### 1. Por qué no hay que tocar la creación de tenants

Con esta funcionalidad construida, crear el primer admin de un tenant deja
de ser un caso especial: el superadmin crea el tenant exactamente igual
que hoy, y entra a la pestaña "Usuarios" de ese tenant (recién vacía) para
crear el primer usuario con el mismo formulario que usaría para cualquier
usuario nuevo más adelante. Un solo camino para crear usuarios de tenant
desde plataforma, no dos.

### 2. Los use-cases de `identity` ya se pueden reusar tal cual

Revisados los 6 use-cases relevantes de
`apps/api/src/modules/identity/application/use-cases/`:

| Use-case | Constructor | ¿Necesita `currentUser`? |
|---|---|---|
| `CreateUserUseCase` | `(userRepo, hasher)` | No |
| `ListUsersUseCase` | `(userRepo)` | No |
| `EditUserUseCase` | `(userRepo)` | Sí — `currentUser.roles.includes('admin_institucion')` |
| `DeactivateUserUseCase` | `(userRepo)` | Sí — mismo chequeo + no auto-desactivarse |
| `ReactivateUserUseCase` | `(userRepo)` | Sí — mismo chequeo |
| `ResetUserPasswordUseCase` | `(userRepo, hasher)` | No |

Ninguno depende de nada específico del pipeline de una request de tenant
normal (JWT strategy, CASL) — solo de sus dependencias explícitas. Eso
permite instanciarlos **a mano**, fuera de la inyección de dependencias de
Nest, contra un repositorio armado para el schema que el superadmin eligió
— la inyección normal de `UserRepositoryPort` resuelve el tenant por el
header de subdominio de la request actual, que en una request de
`/platform` no es el tenant que se quiere gestionar.

### 3. Conexión puntual al schema del tenant elegido

Nuevo helper en el módulo `platform`:

```ts
// apps/api/src/modules/platform/infrastructure/tenant-schema-connection.ts
export async function withTenantSchemaConnection<T>(
  schemaName: string,
  fn: (dataSource: DataSource) => Promise<T>,
): Promise<T> {
  const dataSource = new DataSource(tenantSchemaOptions(schemaName));
  await dataSource.initialize();
  try {
    return await fn(dataSource);
  } finally {
    await dataSource.destroy();
  }
}
```

Mismo mecanismo que ya usa `SchemaProvisionerAdapter` para migrar un
schema (`tenantSchemaOptions`, de `tenant.datasource.ts`) — nada nuevo a
nivel de infraestructura, solo se generaliza para abrir/cerrar una
conexión por acción en vez de por migración.

### 4. Identidad sintética para los 3 use-cases que la piden

```ts
function buildSyntheticActor(platformAdmin: PlatformJwtPayload, schemaName: string): JwtPayload {
  return {
    sub: `platform-admin:${platformAdmin.sub}`,
    email: platformAdmin.email,
    roles: ['admin_institucion'],
    tenantId: schemaName,
  };
}
```

Vive solo en memoria durante esa llamada — nunca se firma como JWT real,
nunca se persiste, nunca sale del servidor. El prefijo `platform-admin:`
en `sub` es intencional: si alguna vez aparece en un log o en
`audit_logs`, queda claro que no es un usuario real de ese tenant.

### 5. Seis nuevos use-cases en `platform`

En `apps/api/src/modules/platform/application/use-cases/`, uno por
acción, todos con la misma forma:

```ts
// platform-create-tenant-user.use-case.ts
@Injectable()
export class PlatformCreateTenantUserUseCase {
  constructor(@Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort) {}

  async execute(tenantId: string, input: CreateUserInput, platformAdmin: PlatformJwtPayload): Promise<User> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) throw new NotFoundException(`No existe la institución "${tenantId}"`);

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      const hasher = new BcryptPasswordHasher();
      const user = await new CreateUserUseCase(users, hasher).execute(input);
      await recordPlatformAudit(dataSource, 'create', 'User', user.id, platformAdmin);
      return user;
    });
  }
}
```

Los seis: `PlatformCreateTenantUserUseCase`,
`PlatformListTenantUsersUseCase`, `PlatformEditTenantUserUseCase`,
`PlatformDeactivateTenantUserUseCase`, `PlatformReactivateTenantUserUseCase`,
`PlatformResetTenantUserPasswordUseCase`. Hay dos nociones distintas de
"actor" acá, que no hay que confundir:

- El **actor sintético** (`buildSyntheticActor`, sección 4) — un
  `JwtPayload` en memoria, solo para satisfacer el chequeo de rol interno
  de `EditUserUseCase`/`DeactivateUserUseCase`/`ReactivateUserUseCase`.
  Solo esos tres lo arman antes de llamar al use-case real.
- El **`platformAdmin` de la auditoría** (`recordPlatformAudit`, sección
  6) — el `PlatformJwtPayload` real de la request, usado para etiquetar
  quién hizo la acción en `audit_logs`. **Los seis** use-cases lo pasan,
  incluidos `PlatformCreateTenantUserUseCase` y
  `PlatformResetTenantUserPasswordUseCase`, que no necesitan armar el
  actor sintético pero igual necesitan auditar quién actuó.

### 6. Auditoría explícita, best-effort

`recordPlatformAudit(dataSource, action, subject, resourceId, platformAdmin)`
reusa `RecordAuditLogUseCase`/`AuditLogRepositoryPort` de `audit`,
instanciados a mano contra la misma conexión puntual (mismo motivo que los
use-cases de `identity`: el repositorio real está atado a
`TENANT_DATA_SOURCE`, resuelto por request, no sirve acá). Se llama
**después** de que la acción principal ya se guardó con éxito. Si el
insert de auditoría falla, se loguea el error y se sigue — no se revierte
la acción principal (mismo criterio de "mejor esfuerzo" que ya usa el
sistema, ej. notificación de notas nuevas en `notify-new-grade.service.ts`).

El registro queda con `actorId: 'platform-admin:' + platformAdmin.sub`,
distinguible de cualquier usuario real de ese tenant en su propio
`audit_logs` — sin esto, no quedaría ningún rastro de que alguien externo
al colegio tocó sus usuarios.

### 7. Controlador nuevo

`apps/api/src/modules/platform/interface/controllers/platform-tenant-users.controller.ts`,
bajo `/platform/tenants/:tenantId/users`, protegido con `PlatformAdminGuard`
(el mismo que ya protege `/platform/tenants`, no CASL — un `PlatformAdmin`
no tiene roles de tenant):

```
POST   /platform/tenants/:tenantId/users
GET    /platform/tenants/:tenantId/users
PATCH  /platform/tenants/:tenantId/users/:id
PATCH  /platform/tenants/:tenantId/users/:id/reset-password
PATCH  /platform/tenants/:tenantId/users/:id/deactivate
PATCH  /platform/tenants/:tenantId/users/:id/reactivate
```

DTOs de request: se reusan `CreateUserDto`/`EditUserDto`/`ListUsersQueryDto`
ya existentes en `identity/interface/dtos/` (mismas reglas de validación,
no hay motivo para duplicarlas) — el GET soporta los mismos filtros
(`role`, `page`, `pageSize`, `search`) que ya soporta el listado de
usuarios de un tenant. Los endpoints de reset-password/deactivate/
reactivate no llevan body.

### 8. Frontend

- Pestaña/sección "Usuarios" nueva dentro de `/platform/tenants/[id]`
  (la página que ya existe para editar metadata) — no una ruta separada.
- Nueva carpeta `apps/web/src/features/platform-tenant-users/` con hooks
  (`use-platform-tenant-users.ts`) y componentes, calcados en estructura y
  estilo de `features/users/*` (tabla, formulario de crear, modal de
  editar, acciones de resetear/desactivar/reactivar) — misma UI, apuntando
  a los endpoints nuevos.
- Rutas BFF nuevas en
  `apps/web/src/app/api/platform/tenants/[id]/users/...`, mismo patrón que
  ya usan las rutas de `/api/platform/tenants/...` (reenvían con la
  cookie/token del superadmin, vía `getCurrentPlatformAdmin`/el helper
  equivalente al `serverApiFetch` de tenant pero para plataforma).

## Casos límite

- **Tenant inexistente:** `NotFoundException` antes de intentar abrir
  ninguna conexión.
- **Usuario inexistente dentro del tenant:** lo maneja el use-case de
  `identity` reusado (ya lanza `NotFoundException`).
- **Falla el insert de auditoría después de que la acción principal ya se
  guardó:** se loguea, no se revierte la acción (best-effort).
- **La conexión puntual al schema no se cierra si algo tira una
  excepción:** se evita con `try/finally` en `withTenantSchemaConnection` —
  siempre se destruye la conexión, haya éxito o error.
- **El schema del tenant fue borrado o está corrupto:** `initialize()`
  de la conexión falla — se propaga como error 500 claro, no se swallowea.

## Testing

- Los seis use-cases nuevos de `platform`: test mockeando
  `withTenantSchemaConnection` (o inyectándolo como dependencia) para
  interceptar la conexión falsa, y verificar que arma correctamente el
  repositorio/hasher/actor y llama al use-case real de `identity` con los
  parámetros esperados. Incluye el caso de tenant inexistente
  (`NotFoundException` sin intentar abrir conexión).
- La función de auditoría (`recordPlatformAudit`): test de que un fallo
  ahí no interrumpe el resultado de la acción principal (mock del
  repositorio de audit tirando error, verificar que la acción igual
  devuelve éxito).
- `withTenantSchemaConnection` en sí (apertura/cierre real de conexión):
  sin test unitario, mismo criterio que `SchemaProvisionerAdapter` — se
  verifica a mano contra la base de desarrollo, creando un tenant real y
  gestionando usuarios en él de punta a punta.
- Sin tests de frontend (no hay framework en `apps/web`, como el resto del
  proyecto) — verificación manual en el navegador.
