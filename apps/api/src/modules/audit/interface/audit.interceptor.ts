import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { ContextId, ContextIdFactory, ModuleRef, Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { RecordAuditLogUseCase } from '../application/use-cases/record-audit-log.use-case';
import { RecordAuditLogEntry } from '../application/ports/audit-log.repository.port';
import { AUDIT_READ_KEY, AuditReadMetadata } from './decorators/audit-read.decorator';
import { AUDIT_SKIP_KEY } from './decorators/audit-skip.decorator';
import { JwtPayload } from '../../../core/auth/jwt-payload.interface';

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Límite conocido, no un bug: los guards de Nest (`ThrottlerGuard`,
 * `JwtAuthGuard`, `PoliciesGuard`) corren ANTES que cualquier interceptor, y
 * pueden rechazar la request (401/403/429) sin que este interceptor llegue a
 * ejecutarse nunca. Un intento de acceso no autenticado o sin permiso, o uno
 * bloqueado por rate-limit, no queda registrado en el log de auditoría —
 * solo se audita el `success: false` de fallas lanzadas DENTRO de la lógica
 * del handler (400/404/409/etc.), no las de los guards previos.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    const skip = this.reflector.getAllAndOverride<boolean | undefined>(AUDIT_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return next.handle();
    }

    let kind: 'write' | 'sensitive_read' | null = WRITE_METHODS.has(method) ? 'write' : null;
    let resourceIdFromRead: string | null = null;

    if (!kind) {
      const metadata = this.reflector.getAllAndOverride<AuditReadMetadata | undefined>(AUDIT_READ_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (metadata) {
        let isSensitive = false;
        try {
          isSensitive = metadata.predicate(request);
        } catch (err) {
          // Un predicado que tira no debe romper el endpoint real que
          // decora — se trata como "no sensible, no auditar" y se sigue.
          this.logger.warn(`@AuditRead predicate falló, no se audita esta lectura: ${(err as Error).message}`);
          isSensitive = false;
        }
        if (isSensitive) {
          kind = 'sensitive_read';
          if (metadata.resourceId) {
            try {
              resourceIdFromRead = metadata.resourceId(request);
            } catch (err) {
              this.logger.warn(`@AuditRead resourceId extractor falló: ${(err as Error).message}`);
              resourceIdFromRead = null;
            }
          }
        }
      }
    }

    if (!kind) {
      return next.handle();
    }

    const user = (request as Request & { user?: JwtPayload }).user;
    const base = {
      actorId: user?.sub ?? null,
      actorEmail: user?.email ?? null,
      actorRoles: user?.roles ?? null,
      method,
      route: request.originalUrl.split('?')[0],
      resourceId: request.params?.id ?? resourceIdFromRead ?? null,
      ipAddress: request.ip ?? null,
      kind,
    };

    // `RecordAuditLogUseCase` es transitivamente `Scope.REQUEST` (vía
    // `TypeOrmAuditLogRepository` -> `TENANT_DATA_SOURCE`). Si este
    // interceptor lo inyectara directo por constructor, Nest lo volvería
    // request-scoped a él también — y como está registrado como
    // `APP_INTERCEPTOR` (global), Nest no logra resolver esa cadena
    // correctamente: construye una instancia "cascarón" cuyo constructor
    // nunca corre (se detectó en vivo: `Object.keys(this)` vacío). Por eso
    // este interceptor se mantiene singleton y resuelve el use case bajo
    // demanda con `ModuleRef#resolve`, atado al `contextId` del request
    // actual — el patrón documentado por Nest para este caso.
    //
    // Nota: `getByRequest` devuelve un contextId "fresco" (no el atado al
    // request real) para requests a `/platform/*` — esos controllers son
    // completamente static-scoped, sin el middleware de tenant que registra
    // el request en el WeakMap de Nest. Para esas rutas, `persist` fallará
    // al resolver el use case (que es request-scoped vía el tenant
    // DataSource) y solo emitirá un warning — es esperado, no un bug: las
    // rutas `/platform/*` no pertenecen al audit trail de ningún tenant.
    const contextId: ContextId = ContextIdFactory.getByRequest(request);

    return next.handle().pipe(
      tap(() => {
        // El status code real todavía no lo fijó Nest en este punto del
        // pipeline (lo hace después de que se resuelven los interceptors) —
        // para el camino exitoso no se intenta adivinar, solo se marca
        // `success: true` con `statusCode: null`. El camino de error sí
        // tiene un código confiable (viene de la excepción atrapada).
        this.persist(contextId, { ...base, statusCode: null, success: true });
      }),
      catchError((err) => {
        const statusCode = typeof err?.getStatus === 'function' ? err.getStatus() : 500;
        this.persist(contextId, { ...base, statusCode, success: false });
        return throwError(() => err);
      }),
    );
  }

  private persist(contextId: ContextId, entry: RecordAuditLogEntry): void {
    this.moduleRef
      .resolve(RecordAuditLogUseCase, contextId)
      .then((recordAuditLog) => recordAuditLog.execute(entry))
      .catch((err: Error) => {
        this.logger.warn(`No se pudo registrar el log de auditoría: ${err.message}`);
      });
  }
}
