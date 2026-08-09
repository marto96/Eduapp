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

- `platform`: alta de instituciones (`POST /platform/tenants`, protegido con
  header `x-platform-admin-key`), aprovisiona el schema del tenant y corre
  sus migraciones automáticamente.
- `identity`: login (`/auth/login`), refresh (`/auth/refresh`) y usuario
  actual (`/auth/me`), con bcrypt + JWT (access/refresh) reales.
- Resolución de tenant real (`TenantRegistryService`, cache en Redis) con
  aislamiento por schema vía `search_path` (`TENANT_DATA_SOURCE`,
  request-scoped) y protección contra cross-tenant token replay.
- Migraciones (`public.tenants`, `users`, `academic_years`/`grades`/
  `sections`) y seed de desarrollo (`pnpm --filter @eduapp/api seed:dev`).
- Frontend: login, panel y gestión de años lectivos, con auth vía cookies
  httpOnly (Next.js Route Handlers como BFF — el navegador nunca ve el JWT).

**`academic`** es el primer módulo de negocio implementado end-to-end
(backend + frontend + DB) como plantilla: años lectivos, grados y secciones
en el backend; años lectivos con UI completa (grados/secciones solo API por
ahora). El resto de los módulos (`enrollment`, `attendance`, `grading`,
`finance`, `hr`, `library`, `communication`, `documents`, `reports`) tienen
su carpeta creada con un `README.md` que explica cómo implementarlos
siguiendo el mismo patrón que `academic`/`identity`.

Pendientes conocidos:

1. CI: lint + test + build en cada PR; deploy automatizado a un entorno de
   staging.
2. RBAC granular con CASL (hoy los roles se chequean con un guard simple
   por rol, ver `core/auth/roles.guard.ts`).
3. Flujo real de superadmin de plataforma (hoy `/platform/*` usa una clave
   compartida, ver `modules/platform/interface/guards/platform-admin.guard.ts`).
4. UI de grados y secciones (el backend ya expone `/academic/grades` y
   `/academic/sections`, siguiendo el mismo patrón que años lectivos).
