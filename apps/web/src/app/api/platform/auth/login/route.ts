import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * BFF de login para el superadmin de plataforma — mismo patrón que
 * `api/auth/login`, pero contra `/platform/auth/login` (sin header de
 * tenant) y guardando el token en una cookie distinta
 * (`platform_access_token`) para no confundirla con la sesión de un
 * tenant. El backend no emite refresh token acá (token de 8h, sin
 * renovación — re-login al expirar).
 *
 * Con 2FA habilitado, el backend devuelve `pendingTwoFactorToken` en vez
 * de `accessToken` — acá no se guarda ninguna cookie todavía, se le pasa
 * el token pendiente al frontend para que pida el código y complete el
 * login en `/api/platform/auth/login/verify-2fa`.
 */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const apiRes = await fetch(`${API_URL}/platform/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!apiRes.ok) {
    const message = await apiRes.text();
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const { accessToken, pendingTwoFactorToken } = await apiRes.json();

  if (pendingTwoFactorToken) {
    return NextResponse.json({ needsTwoFactor: true, pendingToken: pendingTwoFactorToken });
  }

  const isProd = process.env.NODE_ENV === 'production';

  cookies().set('platform_access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });

  return NextResponse.json({ ok: true });
}
