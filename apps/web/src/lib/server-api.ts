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
