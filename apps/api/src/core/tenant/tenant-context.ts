import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto del tenant actual, disponible en toda la cadena de la request
 * (controladores, servicios, repositorios) sin tener que pasarlo manualmente.
 */
export interface TenantContextData {
  tenantId: string;
  schemaName: string;
  subdomain: string;
}

export const tenantAsyncStorage = new AsyncLocalStorage<TenantContextData>();

export function getCurrentTenant(): TenantContextData {
  const ctx = tenantAsyncStorage.getStore();
  if (!ctx) {
    throw new Error(
      'No hay contexto de tenant activo. ¿Se ejecutó fuera de TenantResolutionMiddleware?',
    );
  }
  return ctx;
}
