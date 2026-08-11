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
roadmap de `docs/ARCHITECTURE.md` §4.1-4.4.**

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

El resto de los módulos (`library`, `communication`, `reports`) tienen su
carpeta creada con un `README.md` que explica cómo implementarlos
siguiendo el mismo patrón.

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

Pendientes conocidos:

1. Finanzas: sin becas/descuentos ni conciliación bancaria todavía (primera
   pasada cubre solo cargos + pagos con saldo). Sin editar/anular un cargo o
   pago ya creado.
2. RRHH: sin salario en el modelo, sin baja de legajo ni cancelación de
   licencia todavía (primera pasada cubre solo legajo + licencias con
   detección de solapamiento).
3. Documentos: sin generación real de archivo/PDF (solo el registro de
   emisión), sin firmas digitales, y sin "actas" institucionales (no
   ligadas a una matrícula) — fuera de alcance de la primera pasada.
4. Portal de padres: sin autogestión del vínculo padre↔hijo (hoy solo
   admin/directivo lo cargan desde `/users`) y sin listado detallado
   (asistencia/notas se muestran resumidas, no registro por registro).
5. Comunicados: sin segmentación por audiencia (hoy todo comunicado es
   institucional, visible a todos — no se puede dirigir a una sola sección
   o año), y sin edición/anulación de un comunicado ya publicado.
6. Calendario de eventos: mismo límite que Comunicados (sin segmentación
   por audiencia ni edición/anulación); sin recordatorios ni integración
   con un calendario externo (ICS, Google Calendar).
7. Mensajería interna: sin restricción de a quién se le puede escribir
   (cualquier usuario del tenant le puede escribir a cualquier otro, no
   solo docente↔padre/estudiante); sin badge de no leídos en la nav (hoy
   solo se ve al entrar a `/messages`); sin notificaciones en tiempo real
   ni recordatorios (confirmado que queda para después); sin adjuntos de
   archivos/imágenes (solo texto plano — necesitaría subida a un storage
   externo, no hay nada de eso en el proyecto); sin borrado de mensajes.
8. Encuestas: sin formularios multi-pregunta (solo poll de una pregunta +
   opciones), sin fecha de cierre/vencimiento, sin edición/anulación de
   una encuesta ya publicada, y sin anonimato real (la respuesta queda
   asociada al usuario para poder impedir votar dos veces, aunque no se
   exponga en los resultados).
9. **Fase 3 completa** (los 5 frentes del roadmap de "Comunicación y
   comunidad" están implementados). Quedan sin implementar `library`
   (biblioteca) y `reports` (analítica/dashboards) — ambos ya tienen su
   carpeta con un `README.md` de plantilla en `apps/api/src/modules/`,
   pero ningún código todavía.
