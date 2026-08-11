import { cookies } from 'next/headers';
import type { AuthenticatedUser } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

/**
 * Llama al backend con el access token de la cookie httpOnly + el header de
 * tenant. Para usar desde Server Components y Route Handlers únicamente
 * (depende de `next/headers`).
 */
export async function serverApiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) return null;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export function getCurrentUser(): Promise<AuthenticatedUser | null> {
  return serverApiFetch<AuthenticatedUser>('/auth/me');
}

export interface TenantBranding {
  name: string;
  primaryColor: string;
  logoUrl: string | null;
}

const DEFAULT_BRANDING: TenantBranding = { name: 'EduApp', primaryColor: '#9184d9', logoUrl: null };

/**
 * A diferencia de `serverApiFetch`, no depende de la cookie de sesión —
 * `GET /tenant/public` no requiere JWT (se necesita hasta en `/login`,
 * antes de loguearse). Si falla (backend caído, tenant no resuelto),
 * devuelve el default en vez de tumbar el layout raíz.
 */
export async function getTenantBranding(): Promise<TenantBranding> {
  try {
    const res = await fetch(`${API_URL}/tenant/public`, {
      headers: { 'x-tenant-subdomain': TENANT_SUBDOMAIN },
      cache: 'no-store',
    });
    if (!res.ok) return DEFAULT_BRANDING;
    return (await res.json()) as TenantBranding;
  } catch {
    return DEFAULT_BRANDING;
  }
}
