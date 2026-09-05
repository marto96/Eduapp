import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';

export const AUDIT_READ_KEY = 'audit_read';

/** Decide si ESTA request GET puntual cuenta como lectura sensible a auditar. */
export type AuditReadPredicate = (request: Request) => boolean;

/**
 * Marca un endpoint GET para que `AuditInterceptor` lo registre como lectura
 * sensible. Sin argumento, siempre audita (ej. `GET /users`). Con un
 * predicado, audita solo cuando la condición se cumple (ej. `GET
 * /finance/charges` solo cuando la query trae `enrollmentId`) — mismo
 * mecanismo que `@CheckPolicies` (`SetMetadata` + `Reflector` en el
 * interceptor/guard).
 */
export const AuditRead = (predicate: AuditReadPredicate = () => true) =>
  SetMetadata(AUDIT_READ_KEY, predicate);
