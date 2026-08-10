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
pnpm db:up                  # levanta Postgres + Redis
pnpm dev                    # corre api y web en paralelo (Turborepo)
```

- API: http://localhost:3001
- Web: http://localhost:3000

## Estado actual

**Fase 0 (fundación) completa y funcionando de punta a punta:**

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
  `academic_years`/`grades`/`sections`, `enrollments`, `attendance_records`)
  y seed de desarrollo (`pnpm --filter @eduapp/api seed:dev`).
- Frontend: login, panel, y las pantallas de académico + usuarios +
  matrícula + asistencia, con auth vía cookies httpOnly (Next.js Route
  Handlers como BFF — el navegador nunca ve el JWT) y navegación compartida
  (`app/(dashboard)/layout.tsx`).
- CI: ESLint + Jest wireados en `apps/api`/`apps/web`, workflow de GitHub
  Actions (`.github/workflows/ci.yml`).

**Módulos de negocio implementados** (backend + frontend + DB), como
plantilla para el resto:

- `academic`: años lectivos, grados y secciones.
- `enrollment`: matrícula de estudiantes en una sección de un año lectivo
  (`POST`/`GET /enrollments`), con una matrícula activa por estudiante y
  año reforzada a nivel de base (índice único parcial).
- `attendance`: asistencia diaria por sección (`POST`/`GET /attendance`),
  con carga masiva por curso+fecha (upsert por `enrollment_id`+`date`, no
  un CRUD de un registro por vez) y validación de que cada matrícula
  pertenezca a la sección/año indicados. A diferencia de `academic`/
  `enrollment` (donde `docente` solo lee), acá `docente` sí puede
  crear/editar — es su tarea diaria (ver `AbilityFactory`).

El resto de los módulos (`grading`, `finance`, `hr`, `library`,
`communication`, `documents`, `reports`) tienen su carpeta creada con un
`README.md` que explica cómo implementarlos siguiendo el mismo patrón.

Pendientes conocidos:

1. Dar de baja / completar una matrícula (`Enrollment.withdraw()`/`.complete()`
   ya existen en el dominio, sin endpoint todavía — mismo criterio que
   `AcademicYear.close()`).
2. UI de grados y secciones para elegir estudiante existente vs. crear uno
   nuevo desde la propia pantalla de matrícula (hoy hay que ir primero a
   `/users`).
3. Reglas CASL a nivel de instancia (ej. "un docente solo ve/marca sus
   propias secciones", "un padre solo ve la asistencia de su hijo") — hoy
   el chequeo es por tipo de recurso, no por instancia.
