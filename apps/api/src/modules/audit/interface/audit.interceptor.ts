import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { RecordAuditLogUseCase } from '../application/use-cases/record-audit-log.use-case';
import { RecordAuditLogEntry } from '../application/ports/audit-log.repository.port';
import { AUDIT_READ_KEY, AuditReadPredicate } from './decorators/audit-read.decorator';
import { JwtPayload } from '../../../core/auth/jwt-payload.interface';

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly recordAuditLog: RecordAuditLogUseCase,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    let kind: 'write' | 'sensitive_read' | null = WRITE_METHODS.has(method) ? 'write' : null;

    if (!kind) {
      const predicate = this.reflector.getAllAndOverride<AuditReadPredicate | undefined>(
        AUDIT_READ_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (predicate && predicate(request)) {
        kind = 'sensitive_read';
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
      resourceId: request.params?.id ?? null,
      ipAddress: request.ip ?? null,
      kind,
    };

    return next.handle().pipe(
      tap(() => {
        // El status code real todavía no lo fijó Nest en este punto del
        // pipeline (lo hace después de que se resuelven los interceptors) —
        // para el camino exitoso no se intenta adivinar, solo se marca
        // `success: true` con `statusCode: null`. El camino de error sí
        // tiene un código confiable (viene de la excepción atrapada).
        this.persist({ ...base, statusCode: null, success: true });
      }),
      catchError((err) => {
        const statusCode = typeof err?.getStatus === 'function' ? err.getStatus() : 500;
        this.persist({ ...base, statusCode, success: false });
        return throwError(() => err);
      }),
    );
  }

  private persist(entry: RecordAuditLogEntry): void {
    this.recordAuditLog.execute(entry).catch((err: Error) => {
      this.logger.warn(`No se pudo registrar el log de auditoría: ${err.message}`);
    });
  }
}
