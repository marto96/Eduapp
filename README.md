# EduApp

Plataforma educativa **multitenant** (web + PWA) para la gestión académica y
administrativa de instituciones educativas.

Ver el documento completo de arquitectura en [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md):
módulos funcionales, modelo de datos, estrategia de multitenancy
(schema-per-tenant en PostgreSQL) y decisiones de stack.

## Estructura

```
apps/api      Backend NestJS (Clean Architecture, multitenant)
apps/web      Frontend Next.js (PWA, diseño minimalista)
packages/     Código compartido (tipos, cliente API, config)
```

## Requisitos

- Node.js 20+
- pnpm 9+
- Docker (para Postgres y Redis en desarrollo)

## Levantar el entorno de desarrollo

```bash
pnpm install
cp .env.example .env        # y en apps/api/.env, apps/web/.env.local según corresponda
pnpm db:up                  # levanta Postgres + Redis (Docker)
pnpm dev                    # corre api y web en paralelo (Turborepo)
```

- API: http://localhost:3001
- Web: http://localhost:3000

> El Postgres del `docker-compose.yml` se expone en el **5433** del host (no
> el 5432 default) para no chocar con otro Postgres que pueda estar corriendo
> en la máquina — dentro de la red de Docker sigue siendo el 5432 de siempre.
> Ajustá `DATABASE_URL` en tu `.env` acorde si tu máquina no tiene ese
> conflicto y preferís el 5432.

## Estado actual

**Fase 0 (fundación), Fase 1 (núcleo académico), Fase 2 (administrativo:
Finanzas + RRHH + Documentos) y Fase 3 (comunidad: Portal de padres +
Comunicados/circulares + Calendario de eventos + Mensajería interna +
Encuestas) completas y funcionando de punta a punta — cierra todo el
roadmap de `docs/ARCHITECTURE.md` §4.1-4.4. Además, el módulo `library`
(Biblioteca) y el módulo `reports` (matrícula/asistencia/finanzas +
boletines de notas en PDF) también están implementados, junto con
conciliación bancaria, generación real de PDFs (documentos y boletines),
pago de cargos por el padre vía MercadoPago, y seguimiento de lectura de
comunicados — ver "Resueltos recientemente" más abajo.**

- `platform`: alta de instituciones (`POST /platform/tenants`), protegido
  por login real de superadmin (`POST /platform/auth/login`, tabla
  `platform_admins`, JWT propio sin `tenantId`). Aprovisiona el schema del
  tenant y corre sus migraciones automáticamente.
- `identity`: login (`/auth/login`), refresh (`/auth/refresh`), usuario
  actual (`/auth/me`), y alta/listado de usuarios (`POST`/`GET /users`) —
  bcrypt + JWT (access/refresh) reales.
- Resolución de tenant real (`TenantRegistryService`, cache en Redis) con
  aislamiento por schema vía `search_path` (`TENANT_DATA_SOURCE`,
  request-scoped) y protección contra cross-tenant token replay.
- RBAC granular con CASL (`core/auth/casl/`): abilities por acción+recurso,
  no un chequeo de rol plano — ver `AbilityFactory` para las reglas por rol.
- Migraciones (`public.tenants`, `public.platform_admins`, `users`,
  `academic_years`/`grades`/`sections`/`subjects`, `enrollments`,
  `attendance_records`, `evaluations`/`grade_scores`, `schedules`,
  `charges`/`payments`, `employees`/`leaves`, `documents`, `guardians`,
  `announcements`, `events`, `messages`, `surveys`/`survey_responses`) y
  seed de desarrollo (`pnpm --filter @eduapp/api seed:dev`).
- Frontend: login, panel, y las pantallas de académico + usuarios +
  matrícula + asistencia + calificaciones + horarios + finanzas + RRHH +
  documentos + portal de padres ("Mi familia") + comunicados + calendario +
  mensajes + encuestas, con auth vía cookies httpOnly (Next.js Route
  Handlers como BFF — el navegador nunca ve el JWT) y navegación
  compartida (`app/(dashboard)/layout.tsx`).
- CI: ESLint + Jest wireados en `apps/api`/`apps/web`, workflow de GitHub
  Actions (`.github/workflows/ci.yml`).

**Módulos de negocio implementados** (backend + frontend + DB), como
plantilla para el resto:

- `academic`: años lectivos, grados, secciones y asignaturas.
- `enrollment`: matrícula de estudiantes en una sección de un año lectivo
  (`POST`/`GET /enrollments`), con una matrícula activa por estudiante y
  año reforzada a nivel de base (índice único parcial).
- `attendance`: asistencia diaria por sección (`POST`/`GET /attendance`),
  con carga masiva por curso+fecha (upsert por `enrollment_id`+`date`, no
  un CRUD de un registro por vez) y validación de que cada matrícula
  pertenezca a la sección/año indicados. A diferencia de `academic`/
  `enrollment` (donde `docente` solo lee), acá `docente` sí puede
  crear/editar — es su tarea diaria (ver `AbilityFactory`).
- `grading`: evaluaciones (examen/tarea/proyecto por sección+asignatura+
  período) y notas por estudiante matriculado (`POST`/`GET
  /grading/evaluations` y `/grading/scores`), mismo criterio de carga
  masiva + upsert que `attendance`, con validación de rango (`0` a
  `maxScore` de la evaluación) y de que la matrícula pertenezca a la
  sección/año de la evaluación. `docente` también puede crear/editar.
- `schedule`: asignación de docente+sección+asignatura a un bloque horario
  (`POST`/`GET /schedule`), con detección de conflictos — ni el mismo
  docente ni la misma sección pueden tener dos horarios superpuestos el
  mismo día (validado en el caso de uso, no con un constraint de Postgres:
  ver nota en `CreateScheduleUseCase`). A diferencia de `attendance`/
  `grading`, acá es tarea administrativa: solo `admin_institucion`/
  `directivo` gestionan, `docente` solo lee su horario.
- `finance` (primer módulo de Fase 2): cargos (`POST`/`GET
  /finance/charges` — matrícula/pensión/otro sobre una matrícula) y pagos
  (`POST`/`GET /finance/payments`), con saldo y estado (`pendiente`/
  `parcial`/`pagado`) calculados al leer, no guardados. Ledger append-only
  (no upsert): permite pagos parciales, y `RecordPaymentUseCase` rechaza
  cualquier pago que supere el saldo pendiente del cargo. Igual que
  `attendance`/`grading`, acá `secretaria` también gestiona (no solo
  admin/directivo) — es tarea administrativa diaria de secretaría.
- `hr` (segundo módulo de Fase 2): legajo de personal (`POST`/`GET
  /hr/employees` — vincula un usuario con rol de staff a un cargo/tipo de
  contrato/fecha de ingreso) y licencias (`POST`/`GET /hr/leaves`), con
  detección de solapamiento por empleado (mismo patrón que `schedule`, sin
  constraint de base). **Visibilidad distinta al resto de los módulos**:
  `Hr` no está en el bloque de lectura compartido — `docente`/
  `estudiante`/`padre_tutor` no tienen ningún acceso, ni de lectura (a
  diferencia de `finance`/`schedule`/`grading`/`attendance`, donde al
  menos leen). Solo `admin_institucion`/`directivo`/`secretaria` (mismo
  criterio de `secretaria` que en `finance`) ven y gestionan legajos.
- `documents` (tercer módulo de Fase 2, cierra el roadmap de Fase 2):
  registro de emisión de constancias/certificados por matrícula
  (`POST`/`GET /documents` — constancia de matrícula/certificado de
  notas/constancia de buena conducta/otro). **No genera el archivo/PDF
  real** — solo el registro de que se emitió, con quién lo emitió
  (`issuedBy`) tomado del JWT vía `@CurrentUser()`, no del body (primera
  vez que un caso de uso recibe el usuario autenticado en vez de
  inferirlo todo de la entidad relacionada). Mismo criterio de
  visibilidad que `finance` (no como `hr`): `docente`/`estudiante`/
  `padre_tutor` leen, solo `admin_institucion`/`directivo`/`secretaria`
  emiten.

`library` (Biblioteca), `communication` (Comunicados/Calendario/Mensajería)
y `reports` (matrícula/asistencia/finanzas + boletines) siguen el mismo
patrón y también están implementados — ver más abajo.

**Fase 3 (comunidad) — primer módulo, Portal de padres**: pantalla `/portal`
("Mi familia" para `padre_tutor`, "Mis datos" para `estudiante`; redirige a
`/dashboard` para el resto de los roles) con una vista consolidada por
matrícula: resumen de asistencia, notas, finanzas y documentos. No agrega
endpoints nuevos — es composición en el frontend de los mismos listados que
ya existían (`GET /enrollments`, `/attendance`, `/grading/scores`,
`/finance/charges`, `/documents`), que ahora **sí** filtran por instancia
para los cinco (antes solo `attendance`/`grading` lo hacían, ver abajo).

**Fase 3 — segundo módulo, Comunicados/circulares** (`communication`):
registro de comunicados/circulares/avisos institucionales (`POST`/`GET
/announcements`), visibles para toda la comunidad (a diferencia de
`documents`/`finance`, no está atado a una matrícula — es información
institucional, no personal de un estudiante, así que no aplica el filtrado
por instancia). Mismo criterio de gestión que `finance`/`documents`:
`admin_institucion`/`directivo`/`secretaria` publican,
`docente`/`estudiante`/`padre_tutor` solo leen. Sin segmentación por
audiencia todavía (sección/año/rol) — ver pendientes.

**Fase 3 — tercer módulo, Calendario de eventos**: segunda entidad del
mismo módulo `communication` (junto a `Announcement`), con `POST`/`GET
/events`. Mismo criterio de gestión y visibilidad que `Announcement`. A
diferencia de este, sí necesita horario (`startsAt`/`endsAt` en
`timestamptz`, no solo `date`) — primer campo de negocio del proyecto que
usa hora además de fecha (`schedules` usa `varchar "HH:mm"`, el resto usa
`date`). Sin solapamiento ni instancia: varios eventos pueden coexistir el
mismo horario, es información institucional sin `enrollmentId`.

**Fase 3 — cuarto módulo, Mensajería interna**: tercera entidad de
`communication` (`Message`), con `POST`/`GET /messages` y `PATCH
/messages/:id/read`. **Rompe el patrón de visibilidad institucional** de
`Announcement`/`Event`: un mensaje solo lo ven su remitente y su
destinatario (`ListMessagesUseCase` filtra por participación —
`senderId`/`recipientId` == usuario actual —, no por rol ni por
matrícula), ni siquiera `admin_institucion` ve mensajes ajenos aunque
tenga `manage` sobre `all`. CASL sigue siendo amplio a nivel de recurso
(`can('manage', 'Message')` para todos los roles, no solo
admin/directivo/secretaria — mensajería es entre pares), la privacidad
real la da el filtro del `WHERE`, no el guard. `readAt` se marca solo por
el destinatario (`ForbiddenException` si lo intenta el remitente); el
frontend (`/messages`, con panel de conversaciones + hilo, agrupando en el
cliente una lista plana por interlocutor) lo dispara automáticamente al
abrir una conversación. Sin recordatorios/notificaciones en tiempo real
(confirmado explícitamente que queda para una iteración futura).
Adicionalmente: **confirmación de lectura visible** (✓/✓✓ bajo cada mensaje
propio, ya no solo el dato en `readAt` sin mostrar) y **edición de
mensajes ya enviados** (`PATCH /messages/:id`, solo el remitente, sin
límite de tiempo ni bloqueo si ya fue leído — mismo criterio que WhatsApp;
guarda `editedAt` y el frontend marca "(editado)").

**Fase 3 — quinto y último módulo, Encuestas** (`survey`, módulo nuevo —
a diferencia de `Announcement`/`Event`/`Message`, no vive dentro de
`communication`; el modelo de datos de alto nivel ya las trataba como un
grupo aparte): encuestas de una pregunta + varias opciones (poll de
opción única, no formularios multi-pregunta). `POST`/`GET /surveys`,
`POST /surveys/:id/responses`, `GET /surveys/:id/results`. Mismo quiebre
de patrón que `Message`: **dos subjects de CASL** — crear una encuesta es
administrativo (`'Survey'`, admin/directivo/secretaria), pero responderla
es para todos (`'SurveyResponse'`, cualquier rol). Una respuesta por
persona (`ConflictException` si repite, más `UNIQUE INDEX (survey_id,
respondent_id)` en la migración como defensa en profundidad — mismo
patrón que `guardians`). Resultados agregados por opción, sin exponer
quién votó qué; el frontend (`/surveys`) muestra el formulario de voto
solo si el usuario todavía no respondió, y pasa a mostrar barras de
resultado (con la propia respuesta resaltada) una vez que sí.

Resueltos recientemente:

- **Baja/completar matrícula**: `PATCH /enrollments/:id/withdraw` y
  `/complete`, con botones en la lista de matrícula (solo
  `admin_institucion`/`directivo`).
- **Matrícula con estudiante nuevo**: la pantalla de matrícula permite
  elegir un estudiante existente o crear uno nuevo (nombre/apellido/email/
  contraseña) en el mismo formulario, sin pasar primero por `/users`.
- **Constraint de superposición a nivel de base**: `schedules` y `leaves`
  tienen un `EXCLUDE USING gist` real (extensión `btree_gist`) además de
  la validación en el caso de uso — cierra la ventana de carrera entre
  `findAll` y `save`. El cast de horas `"HH:mm"` a un tipo comparable para
  el índice no puede usar `::timestamp` (la función de cast es `STABLE`,
  no `IMMUTABLE`, y Postgres lo rechaza en un índice); se arma un
  `int4range` en minutos desde medianoche a mano en su lugar — ver
  `1700000000015-AddScheduleOverlapConstraint.ts`.
- **CASL a nivel de instancia** (`EnrollmentAccessService`, módulo
  `enrollment`): un `docente` solo ve/marca asistencia y notas de las
  secciones donde tiene un horario asignado (`schedules`); un `estudiante`
  o `padre_tutor` solo ve sus propios registros o los de sus hijos
  vinculados (tabla `guardians`, alta vía `POST /guardians`, solo
  `admin_institucion`/`directivo` — sin autogestión, eso queda para más
  adelante). Cubre `attendance`, `grading/scores`, `enrollments`,
  `finance/charges` y `documents`. **No** cubre `schedule` (un horario es
  del docente/sección, no encaja en "datos personales del estudiante" —
  exclusión deliberada, no pendiente).

Resueltos recientemente (4 recortes pendientes):

- **Portal de padres — autogestión del vínculo padre↔hijo**: un
  `padre_tutor` puede solicitarlo desde `/portal` (`POST
  /guardians/requests`, `guardianUserId` forzado desde el JWT — nunca del
  body), pero sigue haciendo falta que `admin_institucion`/`directivo` lo
  apruebe (`PATCH /guardians/:id/approve`) antes de otorgar acceso real —
  `GuardianLink.status` (`'pending' | 'approved'`) y
  `GuardianAccessService.getChildrenIds` solo cuenta los aprobados. Nuevo
  subject de CASL `'GuardianLink'` (`can('create', ...)` solo para
  `padre_tutor`) y endpoint de autoservicio `GET /guardians/mine`.
- **RRHH — salario + baja de legajo + cancelar licencia**: `Employee`
  ahora tiene `salary` opcional y un método `terminate()` (`PATCH
  /hr/employees/:id/terminate`, mismo patrón que
  `Enrollment.withdraw()`). Cancelar una licencia (`PATCH
  /hr/leaves/:id/cancel`) reutiliza el soft-delete que `Leave` ya tenía
  (el constraint de solapamiento de base ya excluía `deleted_at IS NULL`,
  así que no hizo falta tocar la migración de ese constraint).
- **Finanzas — becas/descuentos**: `Charge.discountAmount` (0 por
  defecto, no puede superar el monto). `ListChargesUseCase` ahora calcula
  `netAmount = amount - discountAmount` y simplificó el cálculo de
  `status` a `balance <= 0 ? 'pagado' : ...` — antes una beca del 100% sin
  ningún pago hubiera quedado mal clasificada como "pendiente".
- **Documentos — anulación**: `PATCH /documents/:id/void` marca
  `voidedAt` (`ConflictException` si se reintenta anular uno ya anulado —
  idempotencia explícita). El documento sigue visible en la lista con una
  etiqueta "Anulado" — es un registro histórico, no se oculta ni se
  borra. Se descartó agregar edición del documento emitido: no tiene
  sentido "editar" una constancia ya emitida, solo anularla y emitir una
  nueva si hace falta.

Resueltos recientemente (restricción de mensajería, edición/anulación de
comunicados y eventos, encuestas multi-pregunta):

- **Mensajería — restricción de contacto**: nuevo
  `MessagingPolicyService` (módulo `communication`) evaluado en
  `SendMessageUseCase` antes de crear el mensaje (`ForbiddenException` si
  no aplica). Regla: el staff (`admin_institucion`/`directivo`/
  `secretaria`) es un punto de contacto abierto en ambos sentidos;
  docentes se coordinan libremente entre sí; `docente↔estudiante` o
  `docente↔padre_tutor` requiere una relación real (sección compartida,
  mismo cruce que ya usa `EnrollmentAccessService`: `TeacherSectionsService`
  + `EnrollmentRepositoryPort` + `GuardianAccessService`); `padre_tutor` solo
  le puede escribir a sus propios hijos aprobados. Todo lo demás
  (estudiante↔estudiante, padre↔padre, pares no emparentados) queda
  bloqueado. Es una restricción de instancia, no de tipo de recurso — sin
  cambios de CASL, mismo criterio que `EnrollmentAccessService`.
- **Mensajería — badge de no leídos**: `GET /messages/unread-count`
  (cuenta mensajes propios con `readAt` nulo) consumido por un hook con
  polling de 20s en `NavLinks`; se invalida también al marcar un mensaje
  como leído, así que el número baja apenas se abre la conversación.
- **Comunicados y Calendario — edición y anulación**: mismo patrón para
  `Announcement` y `Event`: `edit(...)` (revalida y marca `editedAt`) y
  `markVoided()` (idempotente, `ConflictException` si se reintenta o si
  se intenta editar algo ya anulado — calcado de
  `IssuedDocument.markVoided()`). `PATCH /announcements/:id` +
  `/announcements/:id/void`, mismo par para `/events`. La UI muestra
  "(editado)"/"ANULADO" y un modo de edición inline sobre la propia
  tarjeta; ambos siguen visibles como registro histórico una vez
  anulados, no se ocultan.
- **Encuestas — multi-pregunta y cierre**: `Survey.questions` reemplaza
  al viejo `question`+`options` únicos (cada pregunta con su propio `id`
  y set de opciones, columna `jsonb`); `SurveyResponse.answers` guarda una
  respuesta por pregunta. `closesAt` opcional + `Survey.isClosed()`:
  votar después de esa fecha devuelve `ConflictException`. La migración de
  restructura (`1700000000030`) descarta los datos de encuestas previas
  (solo eran de prueba). El frontend permite agregar/quitar preguntas al
  crear, y `survey-card` itera resultados por pregunta.

Resueltos recientemente (encuestas, segmentación, finanzas, módulo
Biblioteca):

- **Encuestas — reprogramar cierre y anulación**: `Survey.reschedule()`
  (`PATCH /surveys/:id`, cambia `closesAt` en cualquier momento) y
  `markVoided()` (`PATCH /surveys/:id/void`, deja de aceptar respuestas
  sin importar `closesAt` — mensaje distinto de "cerró" para diferenciar
  el motivo). Se descartó permitir editar preguntas/opciones: una opción
  borrada dejaría respuestas huérfanas — alcance acotado deliberadamente.
  Sobre "anonimato": revisado, ya se cumple por diseño —
  `GetSurveyResultsUseCase` nunca devuelve `respondentId` (solo conteos
  agregados + la propia respuesta) y no hay ningún endpoint que exponga
  `SurveyResponse` crudas — no hizo falta código nuevo.
- **Comunicados y Calendario — segmentación por sección**: `sectionId`
  opcional (`null` = institucional, como antes). Nuevo
  `AudienceAccessService` (módulo `communication`) resuelve qué secciones
  puede ver cada usuario — mismo cruce de fuentes que
  `MessagingPolicyService`/`EnrollmentAccessService`
  (`TeacherSectionsService`, matrículas propias o de los hijos
  aprobados). Staff sigue viendo todo, segmentado o no.
- **Finanzas — editar/anular cargo, anular pago**: `Charge.edit()` (monto,
  descripción, vencimiento, descuento) + `markVoided()`; `Payment`
  también anulable (sin edición — un pago mal cargado se anula y se
  vuelve a registrar, no se corrige in place). `ChargeStatus` gana el
  valor `'anulado'`; `ListChargesUseCase` excluye los pagos anulados del
  cálculo de `paidAmount`/`balance` (si no, anular un pago no cambiaría
  nada).
- **Módulo Biblioteca (`library`)**: primer módulo nuevo desde Fase 3 —
  catálogo de libros (`Book`) + préstamos a estudiantes (`Loan`) con
  devolución. `CreateLoanUseCase` valida disponibilidad (copias totales
  menos préstamos activos) y que el destino tenga rol `estudiante`.
  `ListLoansUseCase` filtra por instancia (estudiante ve lo propio,
  padre_tutor lo de sus hijos aprobados), mismo criterio que
  `EnrollmentAccessService`. Catálogo de solo lectura visible para todos
  (`can('read','Book')` en el bloque compartido); gestión y préstamos
  reservados a admin/directivo/secretaria. Sin integración al Portal
  todavía.

Resueltos recientemente (color de marca personalizable por institución,
tema claro/oscuro real, reskin "Nocturne", dashboard con widgets por rol):

- **Color de marca por institución**: `Tenant.primaryColor` (hex,
  nullable — default `#9184d9` si no se seteó), editable vía nuevo
  `PATCH /platform/tenants/:id` (antes no existía forma de editar un
  tenant ya creado). Nuevo `GET /tenant/public` — sin JWT pero con el
  tenant ya resuelto por `TenantResolutionMiddleware` — expone
  `{name, primaryColor}`; lo consume el layout raíz del frontend
  (`getTenantBranding()`, con fallback si el fetch falla) para inyectar
  `--primary` en runtime en el `<html>`, así el acento de marca aplica
  hasta en `/login`, antes de loguearse. Solo el acento es personalizable
  por institución — fondo/superficie/texto/bordes son iguales para todos
  los tenants, en ambos temas (si no, se pierde control de contraste sin
  agregar valor real). Sin pantalla de superadmin con color-picker
  todavía (no existe frontend de `/platform/*` para nada) — se setea vía
  API, mismo criterio que la creación de tenants hoy.
- **Tema claro/oscuro real**: `.dark` existía en el CSS pero nunca se
  aplicaba (no había switcher). Ahora hay un script bloqueante en el
  `<head>` (lee `localStorage` o `prefers-color-scheme`, aplica `.dark`
  antes del primer paint — evita flash) + un botón `ThemeToggle` nuevo en
  el header compartido, persistido en `localStorage`.
- **Reskin "Nocturne"**: sistema de diseño migrado desde un proyecto
  compartido vía claude.ai/design (`DesignSync.get_file`) a los tokens
  base de EduApp (`globals.css`, `tailwind.config.ts`) y los componentes
  `components/ui/` (`Card` con fondo `surface` propio y padding más
  compacto; `Button` con la variante `primary` pasada a outline en vez de
  relleno sólido, más una variante `secondary` nueva; nuevo `Tag` para
  uso futuro, sin retrofit de los status-badges ya existentes). Cambio a
  nivel de tokens/primitivos: las ~18 páginas existentes lo heredan sin
  haberse tocado una por una — verificado en `/finance` y `/surveys`.
- **`/dashboard` real**: dejó de ser el saludo-stub de la Fase 0. Grid de
  widgets condicionado por rol, todos sobre hooks que ya filtraban por
  rol/instancia en el backend (sin cambios de backend para esto):
  no leídos, próximos eventos, comunicados recientes (todos los roles);
  matrícula activa + secciones + cargos pendientes (admin/directivo);
  cargos pendientes (secretaria); horario de hoy (docente); préstamos
  activos (estudiante/padre_tutor); cargos pendientes + préstamos + link
  a `/portal` (padre_tutor).

Resueltos recientemente (sidebar de navegación, título de sección dinámico
y filtrado de links por rol):

- **Sidebar de navegación**: la barra horizontal de links pasó a un
  sidebar vertical fijo a la izquierda (`components/nav-links.tsx`),
  con el nombre e ícono (`lucide-react`) de cada módulo y el toggle de
  tema arriba. La lista de links se extrajo a
  `apps/web/src/lib/nav-config.ts` (`NAV_LINKS`), compartida con el
  nuevo título de sección.
- **Título de sección dinámico en el header**: nuevo
  `components/page-title.tsx` (`usePathname()` + lookup en
  `NAV_LINKS`) mostrado en `app/(dashboard)/layout.tsx`, pegado al
  sidebar y al mismo nivel que el usuario logueado (nombre + rol +
  avatar con iniciales, ver `lib/roles.ts`) — cambia de "Panel" a
  "Finanzas", etc., al navegar, sin recargar la página.
- **Links filtrados por rol**: antes los 19 links se mostraban a
  cualquier usuario logueado, sin relación con lo que ese rol puede
  hacer. `NavLink` ahora lleva `roles: string[]` (`nav-config.ts`),
  con el mismo criterio ya usado en `lib/permissions.ts`/
  `AbilityFactory` del backend: estructura académica y Usuarios solo
  admin/directivo; Horarios/Matrícula también secretaria+docente;
  Asistencia/Calificaciones admin/directivo+docente (no secretaria);
  Finanzas/RRHH/Documentos admin/directivo+secretaria (no docente, que
  solo tiene lectura); Comunicados/Calendario/Mensajes/Encuestas/
  Biblioteca visibles para todos (módulos institucionales o de
  participación entre pares); "Mi familia" (`/portal`) exclusivo de
  estudiante/padre_tutor, igual que ya redirigía la página. Filtro solo
  de navegación — la autorización real sigue siendo CASL en el backend.

Resueltos recientemente (módulo de superadministrador — personalización
por institución de color, logo y nombre):

- **Frontend de plataforma, antes inexistente**: hasta ahora
  `/platform/*` solo se gestionaba por curl (creación de tenants, y el
  `PATCH` de color agregado en el batch anterior). Nueva sección
  `apps/web/src/app/platform/` (`login`, `tenants`, `tenants/new`,
  `tenants/[id]`) con su propio flujo de auth BFF —cookie httpOnly
  **`platform_access_token`**, deliberadamente distinta de `access_token`
  (la de sesión de un tenant), para que un superadmin pueda tener ambas
  sesiones abiertas en el mismo navegador sin pisarse. Sin refresh token
  (el backend tampoco lo emite para superadmin — token de 8h, re-login al
  expirar).
- **Logo institucional, campo 100% nuevo**: `Tenant.logoUrl` (antes solo
  existía `primaryColor`). No había ningún mecanismo de subida de
  archivos en el proyecto — se construyó uno mínimo: puerto
  `LogoStoragePort` (Clean Architecture, mismo patrón que
  `TenantRepositoryPort`) con un único adapter `LocalDiskLogoStorage`
  (disco local + `@nestjs/serve-static` sirviendo `/uploads`). El puerto
  siempre devuelve una URL absoluta — el día que se necesite S3/cloud
  storage en producción, el cambio queda contenido a un adapter nuevo,
  sin tocar casos de uso ni frontend. `POST /platform/tenants/:id/logo`
  (multipart, límite 2MB, solo png/jpeg/svg+xml/webp).
- **Nuevos endpoints**: `GET /platform/tenants/:id` (antes solo existía
  list/create/update, faltaba el fetch individual que necesita el
  formulario de edición) y `GET /platform/auth/me` (para que el layout
  del frontend valide el token contra el backend, no solo la presencia
  de la cookie — mismo criterio que `getCurrentUser()` del lado tenant).
- **`GET /tenant/public` gana `logoUrl`**: el sidebar de
  `(dashboard)/layout.tsx` ahora muestra el logo real de la institución
  en vez del texto fijo "EduApp" (con fallback al nombre real del tenant,
  no más al string hardcodeado, si no hay logo seteado). Mismo cache de
  60s en Redis que ya tenía `primaryColor` — tradeoff ya aceptado, un
  cambio de logo/color tarda hasta 60s en reflejarse sin reiniciar Redis.
- **Fuera de alcance, explícito**: sin adapter de S3 (solo el puerto
  listo para agregarlo), sin redimensionado de imagen, un solo logo por
  tenant (sin historial), sin autogestión para `admin_institucion` (es
  exclusivo de superadmin), sin control de suspender/reactivar tenant en
  la UI (no hay caso de uso de backend para `status` todavía).

Resueltos recientemente (cierre del backlog: storage genérico, PDFs reales,
conciliación bancaria, módulo `reports`, boletines, pago del padre por
MercadoPago, seguimiento de lectura de comunicados, horarios por curso):

- **Storage genérico (`FileStoragePort`), reemplaza el `LogoStoragePort`
  de logos**: `core/storage/` (`@Global()`, un solo adapter
  `LocalDiskFileStorage`) — `save(category, filename, file, visibility)`
  con `visibility: 'public' | 'private'`. `'public'` sigue sirviéndose por
  `/uploads` (logos); `'private'` guarda bajo `PRIVATE_UPLOADS_DIR`
  (nuevo, `./private-uploads` por defecto), **nunca** registrado en
  `ServeStaticModule` — solo legible vía un endpoint autenticado que llama
  `.read()`. Base para Documentos (Parte 4) y Mensajería (Parte 3), que
  necesitaban archivos por-registro no-públicos, algo que el
  `LogoStoragePort` (un archivo fijo por tenant, siempre público) no podía
  cubrir sin duplicar código.
- **Portal — detalle completo**: `ChildSummaryCard` pasó de contadores de
  asistencia (`"Presente: 12 · Ausente: 2"`) a un listado por fecha, igual
  de granular que notas/cargos/documentos en la misma card. Nueva sección
  "Préstamos" (vía `useLoans()`, ya filtraba por instancia en el backend)
  agrupada por hijo.
- **Calendario — export ICS**: `GET /calendar/feed.ics` (`@Public()`, sin
  JWT — pensado para suscribirse desde una app de calendario externa),
  arma el feed RFC 5545 a mano con los eventos institucionales
  (`sectionId === null`; los segmentados por sección quedan fuera, no hay
  forma de autenticar el feed por audiencia sin JWT). Botón "Agregar a mi
  calendario" en `/calendar` que copia la URL.
- **Mensajería — borrado, adjuntos y tiempo real**: `DELETE /messages/:id`
  (solo el remitente, reutiliza el `deletedAt`/soft-delete que ya existía
  sin usar en el ORM). Adjuntos (`POST`/`GET /messages/:id/attachment`,
  límite 5MB, guardados como privados vía `FileStoragePort`). Tiempo real
  sin sumar `socket.io`: `GET /messages/stream` con `@Sse()` de NestJS +
  Redis pub/sub (`redis.duplicate()` por conexión, canal
  `messages:<userId>`) — el frontend no puede mandar headers de auth en un
  `EventSource` nativo, así que hay un proxy BFF
  (`api/messages/stream/route.ts`) que lee la cookie httpOnly server-side
  y streamea la respuesta. El polling de 20s se mantiene como fallback si
  la conexión SSE se cae.
- **Documentos — generación real de PDF**: nueva dependencia `pdfkit` (sin
  Chrome headless). `IssueDocumentUseCase` genera el PDF al emitir y lo
  guarda como privado (`pdfGeneratedAt` marca si hay uno descargable —
  documentos emitidos antes de este cambio no lo tienen). `GET
  /documents/:id/pdf` valida acceso con el mismo
  `EnrollmentAccessService` que ya usaba el listado. Plantilla simple de
  texto, sin logo posicionado ni firma digital.
- **Finanzas — conciliación bancaria**: nueva entidad `BankTransaction`.
  `POST /finance/bank-transactions/import` (CSV `date,amount,description`,
  parseo manual — formato fijo, no ameritaba una librería) y `PATCH
  /finance/bank-transactions/:id/match` para vincular manualmente una
  transacción a un pago ya registrado. Sin auto-matching por monto/fecha
  ni formatos bancarios estructurados (OFX/MT940) — matching manual como
  primer paso.
- **Módulo `reports`, antes solo la carpeta plantilla**: cuatro reportes,
  todos agregando en memoria sobre `findAll()` de los módulos existentes
  (mismo patrón que `ListChargesUseCase` — ningún repository tiene
  conteo/suma en la base). `GET /reports/enrollment`, `/attendance`,
  `/finance` (matrícula activa, % asistencia, cobrado vs. pendiente,
  reservados a `admin_institucion`/`directivo` — nuevo subject CASL
  `'Report'`) y **boletines de notas** (`GET
  /reports/grading/report-card.pdf`, guardián de CASL `'Grading'`, no
  `'Report'` — un docente genera boletines de su propia sección como
  tarea normal, no como analítica institucional): un solo `studentId` da
  el boletín individual, varios o ninguno dan un PDF combinado con una
  página por estudiante (`pdfkit`, sin necesitar un `.zip`). El boletín se
  recalcula al vuelo con las notas actuales — no se persiste, a
  diferencia de los documentos de la Parte 4. `attendance`/`finance`/
  `grading`/`academic` tuvieron que empezar a exportar sus repository
  ports desde su `@Module` para que `reports` pudiera inyectarlos (antes
  solo `enrollment` lo hacía). Nueva página `/reports` con pestañas,
  visible para docente solo por la de boletines.
- **Finanzas — que el padre pague desde el Portal**: gateway MercadoPago
  Checkout Pro (una sola integración cubre tarjeta/transferencia/efectivo
  en puntos de cobro, todo dentro del mismo checkout hosteado — no hace
  falta manejar efectivo aparte). Nueva entidad `PaymentAttempt`
  (necesaria porque la confirmación real llega async por webhook, no en
  el click) — `POST /finance/charges/:id/checkout` crea el intento y
  redirige; `POST /finance/payments/webhook` (público, firma verificada
  vía `MERCADOPAGO_WEBHOOK_SECRET`) confirma contra la API real de
  MercadoPago y recién ahí crea el `Payment`, de forma idempotente. El
  webhook no llega por el Host normal (lo llama MercadoPago, no un
  tenant) — mismo patrón ya usado para `/uploads`: se excluye de
  `TenantResolutionMiddleware` y resuelve tenant por un `?tenant=` en la
  URL. Botón "Pagar" en `/portal`, no en `/finance` (ahí es donde el
  padre ve sus cargos). Probado hasta el límite del entorno: sin
  credenciales reales de sandbox, se confirmó que la integración llega
  correctamente hasta el gateway (error de autenticación esperado con el
  token placeholder) y que el webhook enruta/idempotiza bien con un
  payload sintético — no un pago real de punta a punta.
- **Comunicados — seguimiento de lectura**: nueva tabla
  `announcement_reads` (`PATCH /announcements/:id/read`, idempotente,
  cualquier usuario del tenant; se dispara solo al ver el comunicado,
  mismo patrón que el auto-mark-read de Mensajería). `GET
  /announcements/:id/reads` (solo staff) lista quién lo vio y cuándo.
  Deliberadamente **sin** el denominador de audiencia elegible (cuántos
  deberían haberlo visto) — hubiera requerido reconstruir la misma lógica
  de audiencia segmentada por sección para contar en vez de filtrar, y no
  es lo que se pidió; solo la lista/conteo de lectores confirmados.
- **Horarios — vista completa por curso**: frontend-only, `Schedule` ya
  tenía todos los campos necesarios. Nuevo toggle "Vista lista / Vista
  por curso" en `/schedule` — la vista nueva es una grilla día×horario
  por sección (asignatura + docente por celda), la vista lista original
  se mantiene intacta para el flujo de alta.

Pendientes conocidos:

1. Documentos: sin firmas digitales, y sin "actas" institucionales (no
   ligadas a una matrícula).
2. Calendario de eventos: sin recordatorios por email/push ni sync
   bidireccional con Google Calendar — no hay proveedor de email/push en
   el proyecto (ni SMTP, ni Resend/SendGrid), agregarlo es una decisión de
   infraestructura aparte. El feed ICS ya cubre "verlo en mi calendario".
3. Mensajería interna: adjuntos sin preview inline (solo link de
   descarga); tiempo real vía SSE, no WebSockets (más barato y suficiente
   para el volumen de un chat institucional).
4. Finanzas: conciliación bancaria sin auto-matching (por monto/fecha) ni
   formatos bancarios estructurados (OFX/MT940); pago del padre solo vía
   MercadoPago (sin otro gateway), sin reembolsos vía API ni cobros
   recurrentes/suscripciones.
5. Reportes: tablas de números, sin gráficos/visualizaciones.
6. Comunicados: seguimiento de lectura sin el denominador de audiencia
   elegible (solo lectores confirmados, no "X/Y").
