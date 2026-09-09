import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

/**
 * Canjea el código de handoff de una impersonación por el access token real
 * y lo guarda en la misma cookie que usa un login normal — sin
 * refresh_token, ya que la sesión de impersonación no emite uno (ver
 * `PlatformImpersonateTenantUserUseCase`). No pasa por
 * `apps/web/src/middleware.ts` (no está en su `matcher`), así que no hay
 * chequeo de sesión que sortear acá.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const apiRes = await fetch(`${API_URL}/auth/impersonate/consume`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    body: JSON.stringify({ code }),
  });

  if (!apiRes.ok) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'impersonation_expired');
    return NextResponse.redirect(loginUrl);
  }

  const { accessToken } = await apiRes.json();
  const isProd = process.env.NODE_ENV === 'production';

  const response = NextResponse.redirect(new URL('/dashboard', req.url));
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
