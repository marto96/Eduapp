# EduApp — Plataforma Educativa Multitenant

Documento de arquitectura. Versión 1.0 — 8 de agosto de 2026.

## 1. Visión general

EduApp es una plataforma web-móvil (PWA, con ruta clara hacia app nativa) para la gestión académica y administrativa de instituciones educativas. Es **multitenant**: una sola instalación sirve a múltiples instituciones (colegios, institutos, academias), cada una con sus propios usuarios, datos y configuración, aisladas entre sí.

Principios rectores:

- **Clean Architecture / Hexagonal** en el backend: el dominio no depende de frameworks, bases de datos ni HTTP.
- **Modularidad por dominio** (DDD-lite): cada módulo de negocio es autocontenido (domain, application, infrastructure, interface).
- **Aislamiento de tenant estricto**: ningún dato de una institución debe ser accesible por otra, ni por error de programación.
- **Diseño minimalista**: interfaz limpia, tipografía clara, poco ruido visual, mobile-first.
- **Escalabilidad progresiva**: arranca simple (monolito modular), con costuras claras para extraer servicios o pasar a Kubernetes cuando el volumen lo justifique.

## 2. Stack tecnológico

| Capa | Elección | Justificación |
|---|---|---|
| Backend | **NestJS** (Node.js + TypeScript) | DI nativa, modularidad, ideal para Clean Architecture, mismo lenguaje que el frontend, ecosistema maduro para SaaS. |
| Base de datos | **PostgreSQL** | Soporta múltiples schemas de forma nativa (clave para el modelo multitenant elegido), transaccional, extensible (JSONB, full-text search). |
| ORM | **TypeORM** | Buen soporte para cambiar `search_path` / datasource dinámicamente por request, necesario para schema-per-tenant. |
| Cache / colas | **Redis + BullMQ** | Cache de resolución de tenant, sesiones, jobs asíncronos (reportes, notificaciones, envío de correos). |
| Autenticación | **JWT (access + refresh)** + RBAC con **CASL** | Roles y permisos granulares por tenant y por módulo. |
| Frontend web/móvil | **Next.js 14+ (App Router) como PWA** | Un solo código, instalable en móvil, SSR/SSG para performance, offline básico vía service worker. Camino directo a agregar una app nativa (Expo/Capacitor) reutilizando lógica compartida sin reescribir todo. |
| Estilos / UI | **TailwindCSS + shadcn/ui** | Sistema de diseño minimalista, consistente, accesible, altamente personalizable por tenant (theming). |
| Estado / datos remotos | **TanStack Query + Zustand** | Cache de datos de servidor separado del estado de UI. |
| Monorepo | **Turborepo + pnpm workspaces** | Comparte tipos y cliente API entre `web` y futura app móvil nativa; builds incrementales. |
| Infraestructura | **Docker** para desarrollo; contenedores listos para Kubernetes o servicios gestionados (ECS/Cloud Run) en producción | Portabilidad y escalado horizontal. |
| Observabilidad | **OpenTelemetry + Pino (logs estructurados)** | Trazabilidad por tenant desde el día uno. |

### Por qué este stack es "escalable en el tiempo"

- TypeScript de punta a punta reduce fricción entre frontend y backend y facilita compartir tipos (contratos de API generados, DTOs).
- NestJS permite empezar como monolito modular y extraer módulos a microservicios (ya usa el patrón de módulos con límites claros) sin reescribir dominio.
- Next.js + PWA da presencia móvil inmediata sin doble desarrollo; si más adelante se necesita una app 100% nativa, el monorepo ya tiene la estructura (`packages/shared-types`, `packages/api-client`) para agregar `apps/mobile` sin duplicar lógica de negocio.
- PostgreSQL con schema-per-tenant escala hasta cientos de instituciones medianas sin cambiar de estrategia; si una institución crece mucho, se puede migrar su schema a una base de datos dedicada sin cambiar el modelo de dominio.

## 3. Estrategia multitenant: schema-per-tenant

- Un único cluster de PostgreSQL.
- Un **schema `public`** con el registro global: `tenants`, `tenant_domains`, `plans`, `platform_admins`, `billing`.
- Un **schema por institución** (`tenant_colegio_abc`, `tenant_instituto_xyz`, ...) con todas las tablas de negocio (usuarios, académico, financiero, etc.), idéntico en estructura entre tenants (mismas migraciones aplicadas a todos).

### Resolución de tenant

1. Cada institución tiene un subdominio (`colegio-abc.eduapp.com`) o dominio propio (`campus.colegioabc.edu`).
2. Un **middleware NestJS** (`TenantResolutionMiddleware`) intercepta cada request, resuelve el tenant por host (con cache en Redis para evitar consultar `public.tenants` en cada request) y lo publica en un `TenantContext` (usando `AsyncLocalStorage` para que esté disponible en toda la cadena de la request sin pasarlo manualmente).
3. Un **interceptor de datasource** setea `search_path` a `tenant_xxx, public` en la conexión usada por esa request (pool de conexiones por tenant, con límite y expiración LRU para no agotar conexiones si hay muchos tenants).
4. Las migraciones se ejecutan contra todos los schemas de tenant mediante un runner propio (`migration:tenant:all`), y contra `public` por separado.

### Aislamiento y seguridad

- Ninguna query de negocio puede especificar el schema manualmente: siempre se apoya en el `search_path` de la conexión activa del request.
- Los tokens JWT incluyen `tenant_id`; el backend valida que el tenant del token coincida con el tenant resuelto por host, para evitar "cross-tenant token replay".
- Superadmins de plataforma (equipo de EduApp) usan un rol y flujo de autenticación separado, sin acceso directo a datos de negocio salvo soporte explícito y auditado.

## 4. Módulos funcionales

### 4.1 Plataforma (core, no visible para instituciones)

- **Tenant Management**: alta/baja de instituciones, planes, límites de uso, dominios personalizados.
- **Identity & Access**: autenticación, usuarios, roles y permisos (RBAC) por tenant. Roles base: `super_admin` (plataforma), `admin_institucion`, `directivo`, `docente`, `secretaria`, `estudiante`, `padre_tutor`.
- **Notificaciones**: email, push, in-app; plantillas por tenant.
- **Auditoría**: registro de acciones sensibles (cambios de notas, pagos, permisos).

### 4.2 Académico

- **Gestión académica**: años/periodos lectivos, niveles, grados, secciones.
- **Matrícula / Admisiones**: inscripción de estudiantes, documentación, estados de proceso.
- **Plan de estudios**: mallas curriculares, asignaturas, competencias.
- **Horarios**: asignación de docentes, aulas y bloques horarios.
- **Asistencia**: registro diario/por clase, alertas de inasistencia.
- **Evaluaciones y calificaciones**: notas, rúbricas, boletas/libretas, cierre de periodo.
- **Aula virtual**: tareas, materiales, entregas, retroalimentación (LMS ligero).
- **Biblioteca**: catálogo, préstamos, devoluciones.

### 4.3 Administrativo y financiero

- **Pagos y facturación**: pensiones, matrícula, becas/descuentos, conciliación.
- **Recursos humanos**: legajo docente/administrativo, contratos, licencias.
- **Gestión documental**: certificados, constancias, actas, firmas.
- **Transporte escolar**: rutas, asignación de estudiantes.
- **Servicios adicionales**: comedor, actividades extracurriculares.

### 4.4 Comunicación y comunidad

- **Comunicados/circulares**: por institución, sede, grado o sección.
- **Mensajería interna**: docente-padre, docente-estudiante.
- **Portal de padres/tutores**: vista consolidada de hijos, pagos, notas, asistencia.
- **Encuestas y formularios**: satisfacción, matrícula, evaluación docente.
- **Calendario de eventos institucionales**.

### 4.5 Analítica

- **Dashboards por rol**: directivo (indicadores institucionales), docente (rendimiento de curso), padre (seguimiento del hijo).
- **Reportes**: asistencia, rendimiento académico, morosidad, deserción.

> Cada módulo se implementa como un submódulo de NestJS independiente (`modules/<nombre>`), con sus 4 capas (domain, application, infrastructure, interface), y se activa o desactiva por tenant según su plan contratado (feature flags en `tenants.enabled_modules`).

## 5. Modelo de datos (alto nivel)

**Schema `public` (global):**

```
tenants(id, name, subdomain, custom_domain, plan_id, status, enabled_modules[], created_at)
plans(id, name, max_users, max_students, price, features)
tenant_admins(id, tenant_id, user_email, ...)   -- soporte/plataforma
```

**Schema por tenant (`tenant_xxx`):**

```
users(id, email, password_hash, first_name, last_name, status, ...)
roles(id, name)  /  user_roles(user_id, role_id)  /  permissions(...)
academic_years(id, name, start_date, end_date)
grades(id, name, level)  /  sections(id, grade_id, name)
subjects(id, name, area)  /  curricula(id, grade_id, subject_id)
enrollments(id, student_id, section_id, academic_year_id, status)
schedules(id, section_id, subject_id, teacher_id, day, start_time, end_time)
attendance_records(id, enrollment_id, date, status)
evaluations(id, subject_id, section_id, period, type)
grades_scores(id, evaluation_id, student_id, score)
assignments(id, subject_id, section_id, due_date)  /  submissions(...)
invoices(id, student_id, concept, amount, due_date, status)  /  payments(...)
staff(id, user_id, role, hire_date, ...)
documents(id, type, student_id, file_url, issued_at)
announcements(id, title, body, audience, published_at)
messages(id, sender_id, recipient_id, body, sent_at)
library_items(id, title, author, stock)  /  loans(...)
events(id, title, date, audience)
surveys(id, title)  /  survey_responses(...)
```

Todas las tablas de tenant llevan auditoría estándar (`created_at`, `updated_at`, `created_by`, `deleted_at` para soft-delete).

## 6. Estructura de carpetas del monorepo

```
eduapp/
├── apps/
│   ├── api/                     # Backend NestJS
│   │   └── src/
│   │       ├── core/             # Config, database, tenant context, auth guards
│   │       ├── modules/
│   │       │   ├── identity/      # domain / application / infrastructure / interface
│   │       │   ├── platform/
│   │       │   ├── academic/
│   │       │   ├── enrollment/
│   │       │   ├── attendance/
│   │       │   ├── grading/
│   │       │   ├── finance/
│   │       │   ├── hr/
│   │       │   ├── library/
│   │       │   ├── communication/
│   │       │   ├── documents/
│   │       │   └── reports/
│   │       └── main.ts
│   └── web/                     # Frontend Next.js (PWA)
│       └── src/
│           ├── app/               # rutas (App Router)
│           ├── components/ui/     # design system (shadcn)
│           ├── features/          # lógica por módulo, alineada al backend
│           └── lib/
├── packages/
│   ├── shared-types/            # DTOs/contratos compartidos
│   ├── api-client/               # cliente tipado del API (usable por web y futura app móvil)
│   └── config/                   # eslint, tsconfig, tailwind preset compartidos
├── docker-compose.yml            # Postgres + Redis para desarrollo local
├── turbo.json
└── docs/
    └── ARCHITECTURE.md
```

Cada módulo del backend sigue el mismo patrón interno:

```
modules/<modulo>/
├── domain/            # Entidades y reglas de negocio puras, sin dependencias externas
├── application/        # Casos de uso (orquestan el dominio), puertos (interfaces)
├── infrastructure/      # Adaptadores: repositorios TypeORM, clientes externos
└── interface/           # Controladores HTTP, DTOs de entrada/salida, mapeo
```

## 7. Seguridad

- Autenticación JWT (access token corto + refresh token con rotación).
- RBAC granular con CASL: permisos definidos por rol y por módulo, evaluados tanto en backend (fuente de verdad) como reflejados en UI (ocultar/deshabilitar, nunca como única barrera).
- Aislamiento de tenant a nivel de conexión de base de datos (`search_path`), no solo a nivel de filtro en query — reduce el riesgo de fugas por error humano.
- Rate limiting por tenant e IP.
- Cifrado en tránsito (TLS) y en reposo para campos sensibles (datos de menores, pagos).
- Cumplimiento con principios de protección de datos de menores: minimización de datos, consentimiento de tutores, exportación/borrado de datos por solicitud.

## 8. Roadmap sugerido

1. **Fase 0 — Fundación**: monorepo, auth + RBAC, tenant resolution, CI/CD básico, diseño del sistema de UI.
2. **Fase 1 — Núcleo académico**: gestión académica, matrícula, horarios, asistencia, calificaciones.
3. **Fase 2 — Administrativo**: pagos/facturación, gestión documental, RRHH.
4. **Fase 3 — Comunidad**: portal de padres, mensajería, comunicados, encuestas.
5. **Fase 4 — Analítica y extensiones**: dashboards, biblioteca, transporte, aula virtual avanzada.
6. **Fase 5 — Móvil nativo** (si el uso lo justifica): agregar `apps/mobile` (Expo) reutilizando `packages/shared-types` y `packages/api-client`.
