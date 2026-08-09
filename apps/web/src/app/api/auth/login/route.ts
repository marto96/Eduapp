import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

/**
 * BFF: el navegador nunca ve el JWT. Este route handler llama al backend
 * NestJS con el header de tenant (ver TENANT_HEADER_OVERRIDE_ENABLED) y
 * guarda los tokens en cookies httpOnly, no accesibles desde JS del cliente.
 */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const apiRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    body: JSON.stringify({ email, password }),
  });

  if (!apiRes.ok) {
    const message = await apiRes.text();
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const { accessToken, refreshToken } = await apiRes.json();
  const cookieStore = cookies();
  const isProd = process.env.NODE_ENV === 'production';

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });

  return NextResponse.json({ ok: true });
}
