import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Análogo a `serverApiFetch` (`server-api.ts`) pero para el superadmin de
 * plataforma: cookie propia (`platform_access_token`, nunca la misma que
 * `access_token` de un tenant), sin header de tenant (las rutas de
 * plataforma no dependen de ningún tenant resuelto).
 */
export async function platformApiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const token = cookies().get('platform_access_token')?.value;
  if (!token) return null;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

/**
 * Igual que `platformApiFetch`, pero sin colapsar los fallos a `null`:
 * devuelve el status HTTP real y el body parseado, ok o no. Se usa en rutas
 * BFF que necesitan propagar mensajes de error reales del backend (ej.
 * validaciones de los casos de uso de `identity` reutilizados por el panel
 * de superadmin) en vez de un mensaje genérico fijo.
 */
export async function platformApiFetchWithStatus<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: T | { message?: string } | null }> {
  const token = cookies().get('platform_access_token')?.value;
  if (!token) return { status: 401, body: { message: 'No autorizado' } };

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    cache: 'no-store',
  });

  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

export interface PlatformAdmin {
  sub: string;
  email: string;
  totpEnabled: boolean;
}

export function getCurrentPlatformAdmin(): Promise<PlatformAdmin | null> {
  return platformApiFetch<PlatformAdmin>('/platform/auth/me');
}
