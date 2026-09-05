import { of, throwError } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { AuditInterceptor } from './audit.interceptor';
import { RecordAuditLogUseCase } from '../application/use-cases/record-audit-log.use-case';

describe('AuditInterceptor', () => {
  let recordAuditLog: jest.Mocked<RecordAuditLogUseCase>;
  let reflector: jest.Mocked<Reflector>;
  let moduleRef: jest.Mocked<ModuleRef>;
  let interceptor: AuditInterceptor;

  function buildContext(overrides: {
    method: string;
    url?: string;
    params?: Record<string, string>;
    user?: { sub: string; email: string; roles: string[] };
  }): ExecutionContext {
    const request = {
      method: overrides.method,
      originalUrl: overrides.url ?? '/test',
      params: overrides.params ?? {},
      query: {},
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
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = buildContext({ method: 'GET', url: '/academic/sections' });

    interceptor.intercept(context, buildHandler([])).subscribe(() => {
      setImmediate(() => {
        expect(recordAuditLog.execute).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it('loguea un GET con @AuditRead cuando el predicado da true', (done) => {
    reflector.getAllAndOverride.mockReturnValue(() => true);
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

  it('no loguea un GET con @AuditRead cuando el predicado da false', (done) => {
    reflector.getAllAndOverride.mockReturnValue(() => false);
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
});
