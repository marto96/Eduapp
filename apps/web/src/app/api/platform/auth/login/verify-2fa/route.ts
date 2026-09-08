import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Segundo paso del login cuando el superadmin tiene 2FA habilitado — recibe
 * el token pendiente de `/api/platform/auth/login` más el código, y recién
 * acá se guarda la cookie real de sesión.
 */
export async function POST(req: NextRequest) {
  const { pendingToken, code } = await req.json();

  const apiRes = await fetch(`${API_URL}/platform/auth/login/verify-2fa`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pendingToken, code }),
  });

  if (!apiRes.ok) {
    const message = await apiRes.text();
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const { accessToken } = await apiRes.json();
  const isProd = process.env.NODE_ENV === 'production';

  cookies().set('platform_access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });

  return NextResponse.json({ ok: true });
}
