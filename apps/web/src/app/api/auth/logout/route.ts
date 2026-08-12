import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function POST() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  // Best-effort: avisarle al backend que revoque el refresh token. Si esto
  // falla (backend caído, token ya vencido) igual se borran las cookies —
  // no le bloqueamos el logout al usuario por un error de red.
  if (accessToken && refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
          'x-tenant-subdomain': TENANT_SUBDOMAIN,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // no-op: se borran las cookies igual.
    }
  }

  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  return NextResponse.json({ ok: true });
}
