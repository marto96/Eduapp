# Panel de superadmin — hoja de ruta

**Fecha:** 2026-09-08
**Estado:** Confirmado. Cada punto se diseña (spec + plan) recién cuando le toca el turno — esto es una secuencia, no un compromiso de construir todo.

## Contexto

El panel de plataforma (`/platform/*`, autenticado con `PlatformAdmin`,
separado por completo de los usuarios de un tenant) hoy solo gestiona
metadata de instituciones: nombre, logo, color de marca, módulos
habilitados. Inicialmente solo lo usa una persona (el equipo de EduApp,
hoy una sola persona) — ningún tenant tiene ni tendrá acceso a este
perfil.

El orden de abajo prioriza **urgencia operativa real** (qué hace falta
para poder onboardear y sostener al primer cliente pagando) por sobre
"importancia" en abstracto — evita construir capacidades de escala antes
de tener la escala que las justifique.

## Ya existe

- Gestión de tenants: crear/editar nombre, subdominio, dominio propio,
  color de marca, logo, módulos habilitados (`enabledModules`).
- Selector de instituciones (`InstitutionSwitcher`) — hoy solo salta a
  editar metadata de un tenant, no entra a sus módulos operativos.

## Hoja de ruta

1. **Gestión de usuarios por tenant** — crear el primer admin al crear un
   tenant (hoy un tenant nuevo queda sin nadie que pueda loguearse), y
   poder crear/gestionar usuarios de cualquier tenant después. Bloqueante
   para poder arrancar con un cliente nuevo sin tocar la base a mano.
2. **Impersonación ("entrar como")** — el superadmin puede entrar a ver
   los módulos operativos de un tenant como si fuera su admin, vía
   intercambio de token (no un sistema de permisos nuevo). Valioso para
   soporte, debugging, y demos con datos reales de un cliente.
3. **Auditoría cross-tenant** — `AuditLog` hoy solo lo ve un admin
   *dentro* de su propio tenant. El superadmin necesita poder investigar
   un reporte de un cliente sin tener que impersonar primero.
4. **Métricas de uso por tenant** — estudiantes, secciones activas,
   último login, uso de storage. Sirve para saber qué tan activo está
   cada colegio, y es prerequisito si más adelante se factura por uso.
5. **Facturación/suscripción por tenant** — plan y estado de pago por
   institución. Solo tiene sentido cuando ya se cobra de verdad.
6. **Gestión de otros superadmins** — hoy `platform_admins` es una tabla
   sin ninguna UI para crear más filas. Necesario el día que se sume
   alguien más al equipo (dev, ventas, soporte), posiblemente con roles
   distintos entre superadmins (ej. "solo lectura" para demos).
7. **Salud del sistema** — dashboard de errores, uptime, tamaño de DB por
   tenant. Con pocos tenants, un problema probablemente se nota usando la
   plataforma antes que por un dashboard dedicado.

## Próximo paso

Diseñar el punto 1 (gestión de usuarios por tenant) como spec completo —
es la primera vez que un `PlatformAdmin` necesita leer/escribir dentro
del schema de un tenant para algo más que aprovisionarlo, así que se
trata como capacidad nueva, no como ajuste a lo que ya existe.
