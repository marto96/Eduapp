import { of, throwError } from 'rxjs';
import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { ContextIdFactory, ModuleRef, Reflector } from '@nestjs/core';
import { AuditInterceptor } from './audit.interceptor';
import { RecordAuditLogUseCase } from '../application/use-cases/record-audit-log.use-case';
import { AUDIT_READ_KEY } from './decorators/audit-read.decorator';
import { AUDIT_SKIP_KEY } from './decorators/audit-skip.decorator';

/**
 * El interceptor ahora consulta `reflector.getAllAndOverride` dos veces por
 * request (primero AUDIT_SKIP_KEY, después AUDIT_READ_KEY para los GET que
 * no calificaron por método) — este helper simula ese comportamiento real de
 * `Reflector` según la key pedida, en vez de un `mockReturnValue` plano que
 * respondería igual a ambas consultas.
 */
function mockReflectorByKey(
  reflector: jest.Mocked<Reflector>,
  values: { skip?: boolean; read?: unknown },
) {
  reflector.getAllAndOverride.mockImplementation((key: unknown) => {
    if (key === AUDIT_SKIP_KEY) return values.skip;
    if (key === AUDIT_READ_KEY) return values.read;
    return undefined;
  });
}

describe('AuditInterceptor', () => {
  let recordAuditLog: jest.Mocked<RecordAuditLogUseCase>;
  let reflector: jest.Mocked<Reflector>;
  let moduleRef: jest.Mocked<ModuleRef>;
  let interceptor: AuditInterceptor;

  function buildContext(overrides: {
    method: string;
    url?: string;
    params?: Record<string, string>;
    query?: Record<string, string>;
    user?: { sub: string; email: string; roles: string[] };
  }): ExecutionContext {
    const request = {
      method: overrides.method,
      originalUrl: overrides.url ?? '/test',
      params: overrides.params ?? {},
      query: overrides.query ?? {},
      ip: '127.0.0.1',
      user: overrides.user,
    };
    return {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({}) }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  function buildHandler(result: unknown, shouldThrow = false): CallHandler {
    return {
      handle: () => (shouldThrow ? throwError(() => result) : of(result)),
    };
  }

  beforeEach(() => {
    recordAuditLog = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<RecordAuditLogUseCase>;
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    // El interceptor resuelve `RecordAuditLogUseCase` bajo demanda vía
    // `ModuleRef#resolve` (ver comentario en audit.interceptor.ts sobre por
    // qué no se inyecta directo por constructor) — se mockea para que
    // devuelva siempre el mismo mock, como haría Nest para un contextId real.
    moduleRef = { resolve: jest.fn().mockResolvedValue(recordAuditLog) } as unknown as jest.Mocked<ModuleRef>;
    interceptor = new AuditInterceptor(reflector, moduleRef);
  });

  it('loguea toda escritura (POST/PATCH/DELETE) sin necesidad de decorador', (done) => {
    const context = buildContext({
      method: 'DELETE',
      url: '/academic/sections/sec-1',
      params: { id: 'sec-1' },
      user: { sub: 'user-1', email: 'admin@test.com', roles: ['admin_institucion'] },
    });

    interceptor.intercept(context, buildHandler({ ok: true })).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            actorId: 'user-1',
            actorEmail: 'admin@test.com',
            method: 'DELETE',
            route: '/academic/sections/sec-1',
            resourceId: 'sec-1',
            kind: 'write',
            success: true,
          }),
        );
        done();
      });
    });
  });

  it('no loguea un GET sin decorador @AuditRead', (done) => {
    mockReflectorByKey(reflector, { read: undefined });
    const context = buildContext({ method: 'GET', url: '/academic/sections' });

    interceptor.intercept(context, buildHandler([])).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it('loguea un GET con @AuditRead cuando el predicado da true', (done) => {
    mockReflectorByKey(reflector, { read: { predicate: () => true } });
    const context = buildContext({
      method: 'GET',
      url: '/users',
      user: { sub: 'user-1', email: 'admin@test.com', roles: ['admin_institucion'] },
    });

    interceptor.intercept(context, buildHandler([])).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).toHaveBeenCalledWith(
          expect.objectContaining({ method: 'GET', kind: 'sensitive_read' }),
        );
        done();
      });
    });
  });

  it('loguea un GET con @AuditRead y guarda el resourceId extraído de la query cuando el predicado da true', (done) => {
    mockReflectorByKey(reflector, {
      read: {
        predicate: (request: { query: Record<string, string> }) => !!request.query.enrollmentId,
        resourceId: (request: { query: Record<string, string> }) => request.query.enrollmentId ?? null,
      },
    });
    const context = buildContext({
      method: 'GET',
      url: '/finance/charges',
      query: { enrollmentId: 'enr-1' },
      user: { sub: 'user-1', email: 'admin@test.com', roles: ['admin_institucion'] },
    });

    interceptor.intercept(context, buildHandler([])).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).toHaveBeenCalledWith(
          expect.objectContaining({ method: 'GET', kind: 'sensitive_read', resourceId: 'enr-1' }),
        );
        done();
      });
    });
  });

  it('no loguea un GET con @AuditRead cuando el predicado da false', (done) => {
    mockReflectorByKey(reflector, { read: { predicate: () => false } });
    const context = buildContext({ method: 'GET', url: '/finance/charges' });

    interceptor.intercept(context, buildHandler([])).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it('registra el error y el status code cuando el handler falla, sin ocultar el error original', (done) => {
    const context = buildContext({ method: 'POST', url: '/enrollments' });
    const error = { message: 'boom', getStatus: () => 409 };

    interceptor.intercept(context, buildHandler(error, true)).subscribe({
      error: (thrown) => {
        setImmediate(() => {
          expect(thrown).toBe(error);
          expect(recordAuditLog.execute).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, statusCode: 409 }),
          );
          done();
        });
      },
    });
  });

  it('no rompe la respuesta si falla la escritura del log', (done) => {
    recordAuditLog.execute.mockRejectedValue(new Error('db down'));
    const context = buildContext({ method: 'DELETE', url: '/academic/sections/sec-1' });

    interceptor.intercept(context, buildHandler({ ok: true })).subscribe((value) => {
      expect(value).toEqual({ ok: true });
      done();
    });
  });

  it('no rompe la respuesta si moduleRef.resolve() falla (no solo si falla execute())', (done) => {
    moduleRef.resolve = jest.fn().mockRejectedValue(new Error('module not found'));
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const context = buildContext({ method: 'DELETE', url: '/academic/sections/sec-1' });

    interceptor.intercept(context, buildHandler({ ok: true })).subscribe((value) => {
      expect(value).toEqual({ ok: true });
      setImmediate(() => {
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        done();
      });
    });
  });

  it('usa el MISMO contextId que ContextIdFactory.getByRequest() derivó para el request, no uno nuevo', (done) => {
    // Se espía (sin mockear) `getByRequest` para capturar el valor real que
    // devuelve para ESTE request específico, y se verifica que sea
    // exactamente (===) el que recibe `moduleRef.resolve` — no "algún"
    // contextId, sino el mismo objeto que Nest asocia a este request (vía
    // `getByRequest`, no `ContextIdFactory.create()`, que mintaría uno
    // nuevo y desconectado del `TENANT_DATA_SOURCE` real del request).
    const getByRequestSpy = jest.spyOn(ContextIdFactory, 'getByRequest');
    const context = buildContext({
      method: 'DELETE',
      url: '/academic/sections/sec-1',
      params: { id: 'sec-1' },
      user: { sub: 'user-1', email: 'admin@test.com', roles: ['admin_institucion'] },
    });

    interceptor.intercept(context, buildHandler({ ok: true })).subscribe(() => {
      setImmediate(() => {
        expect(getByRequestSpy).toHaveBeenCalledTimes(1);
        const actualContextId = getByRequestSpy.mock.results[0].value;
        expect(moduleRef.resolve).toHaveBeenCalledWith(RecordAuditLogUseCase, actualContextId);
        getByRequestSpy.mockRestore();
        done();
      });
    });
  });

  it('no loguea nada para un endpoint marcado @AuditSkip(), aunque sea un write (POST/PATCH)', (done) => {
    mockReflectorByKey(reflector, { skip: true });
    const context = buildContext({ method: 'PATCH', url: '/messages/msg-1/read', params: { id: 'msg-1' } });

    interceptor.intercept(context, buildHandler({ ok: true })).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it('un predicado @AuditRead que tira no rompe el request real; se trata como no sensible y no se audita', (done) => {
    mockReflectorByKey(reflector, {
      read: {
        predicate: () => {
          throw new Error('predicado roto');
        },
      },
    });
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const context = buildContext({ method: 'GET', url: '/finance/charges' });

    interceptor.intercept(context, buildHandler([{ ok: true }])).subscribe((value) => {
      expect(value).toEqual([{ ok: true }]);
      setImmediate(() => {
        expect(recordAuditLog.execute).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        done();
      });
    });
  });
});
