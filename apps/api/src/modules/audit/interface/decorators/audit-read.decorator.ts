import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';

export const AUDIT_READ_KEY = 'audit_read';

/** Decide si ESTA request GET puntual cuenta como lectura sensible a auditar. */
export type AuditReadPredicate = (request: Request) => boolean;

/**
 * Extrae, de una request GET ya marcada como sensible, el id del recurso
 * consultado — para endpoints donde ese id no viaja en `:id` de la ruta (ej.
 * `GET /finance/charges?enrollmentId=...`, filtrado por query string, no por
 * route param).
 */
export type AuditResourceIdExtractor = (request: Request) => string | null;

export interface AuditReadMetadata {
  predicate: AuditReadPredicate;
  resourceId?: AuditResourceIdExtractor;
}

/**
 * Marca un endpoint GET para que `AuditInterceptor` lo registre como lectura
 * sensible. Sin argumentos, siempre audita (ej. `GET /users`). Con un
 * predicado, audita solo cuando la condición se cumple (ej. `GET
 * /finance/charges` solo cuando la query trae `enrollmentId`) — mismo
 * mecanismo que `@CheckPolicies` (`SetMetadata` + `Reflector` en el
 * interceptor/guard).
 *
 * El segundo argumento opcional (`resourceId`) resuelve qué id guardar en el
 * log cuando el recurso auditado no tiene `:id` de ruta — el interceptor
 * solo lo invoca si la lectura ya calificó como sensible.
 */
export const AuditRead = (
  predicate: AuditReadPredicate = () => true,
  resourceId?: AuditResourceIdExtractor,
) => SetMetadata(AUDIT_READ_KEY, { predicate, resourceId });
