# Módulo: finance

Pagos, facturación, becas y conciliación.

Este módulo todavía no está implementado. Seguir exactamente el patrón del
módulo `identity` (`apps/api/src/modules/identity`) como plantilla:

- `domain/entities`: entidades y reglas de negocio puras (sin TypeORM, sin NestJS).
- `application/ports`: interfaces que el dominio necesita (repositorios, servicios externos).
- `application/use-cases`: un caso de uso por acción de negocio, orquesta el dominio a través de los puertos.
- `infrastructure/entities`: entidades TypeORM (mapeo a tablas).
- `infrastructure/repositories`: implementación concreta de los puertos.
- `interface/controllers` + `interface/dtos`: HTTP, validación de entrada, sin lógica de negocio.
- `finance.module.ts`: wiring de NestJS (imports, providers, controllers).

Registrar el módulo en `app.module.ts` una vez implementado.
