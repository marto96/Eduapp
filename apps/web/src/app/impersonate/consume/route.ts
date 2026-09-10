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
/**
 * `req.url` no refleja el subdominio real del tenant en este dev server
 * (siempre cae al host base) — por eso las redirecciones de esta ruta se
 * arman explícitamente contra el header `Host` de la request entrante, no
 * contra `req.url`.
 */
function sameOriginUrl(req: NextRequest, path: string): URL {
  const host = req.headers.get('host') ?? req.nextUrl.host;
  return new URL(path, `${req.nextUrl.protocol}//${host}`);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(sameOriginUrl(req, '/login'));
  }

  const apiRes = await fetch(`${API_URL}/auth/impersonate/consume`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-subdomain': TENANT_SUBDOMAIN },
    body: JSON.stringify({ code }),
  });

  if (!apiRes.ok) {
    const loginUrl = sameOriginUrl(req, '/login');
    loginUrl.searchParams.set('error', 'impersonation_expired');
    return NextResponse.redirect(loginUrl);
  }

  const { accessToken } = await apiRes.json();
  const isProd = process.env.NODE_ENV === 'production';

  const response = NextResponse.redirect(sameOriginUrl(req, '/dashboard'));
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
  response.cookies.delete('refresh_token');
  return response;
}
