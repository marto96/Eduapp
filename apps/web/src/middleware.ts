import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Decodifica (sin verificar firma) el claim `exp` de un JWT — alcanza para
 * decidir si conviene refrescar antes de llamar al backend; la validación
 * real de la firma la sigue haciendo el backend en cada request.
 */
function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(base64));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function isAccessTokenValid(token: string | undefined): boolean {
  if (!token) return false;
  const expiryMs = getTokenExpiryMs(token);
  return expiryMs !== null && expiryMs > Date.now() + 5000;
}

/**
 * `req.cookies.set()` actualiza el mapa interno de cookies del request, pero
 * no reescribe el header `Cookie` crudo que termina leyendo `cookies()` en
 * el Server Component — así que sin esto, la misma navegación que disparó
 * el refresh seguía viendo el access_token viejo y `getCurrentUser()`
 * devolvía null (confirmado: el refresh emitía cookies nuevas en la
 * respuesta, pero el layout igual redirigía a /login). Reconstruir el
 * header `Cookie` a mano es lo único que garantiza que este mismo request
 * ya vea el token nuevo.
 */
function buildCookieHeader(
  existing: { name: string; value: string }[],
  overrides: Record<string, string>,
): string {
  const cookies = new Map(existing.map((c) => [c.name, c.value]));
  for (const [name, value] of Object.entries(overrides)) cookies.set(name, value);
  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

/**
 * El cookie `access_token` no tiene `maxAge` (dura toda la sesión del
 * navegador), así que sigue "presente" mucho después de que el JWT que
 * contiene expiró (15 min) — por eso no alcanza con chequear que exista,
 * hay que decodificar el `exp`. Si expiró pero hay `refresh_token`, se pide
 * un par nuevo a `POST /auth/refresh` de forma transparente antes de dejar
 * pasar el request — así la sesión no se corta cada 15 minutos.
 */
export async function middleware(req: NextRequest) {
  const accessToken = req.cookies.get('access_token')?.value;
  if (isAccessTokenValid(accessToken)) {
    return NextResponse.next();
  }

  const refreshToken = req.cookies.get('refresh_token')?.value;
  const loginUrl = new URL('/login', req.url);

  if (!refreshToken) {
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete('access_token');
    return res;
  }

  try {
    const apiRes = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-tenant-subdomain': TENANT_SUBDOMAIN },
      body: JSON.stringify({ refreshToken }),
    });

    if (!apiRes.ok) {
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete('access_token');
      res.cookies.delete('refresh_token');
      return res;
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await apiRes.json();

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(
      'cookie',
      buildCookieHeader(req.cookies.getAll(), {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      }),
    );

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.cookies.set('access_token', newAccessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.cookies.set('refresh_token', newRefreshToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    return res;
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/academic/:path*',
    '/users/:path*',
    '/enrollment/:path*',
    '/attendance/:path*',
    '/grading/:path*',
    '/schedule/:path*',
    '/finance/:path*',
    '/hr/:path*',
    '/documents/:path*',
    '/portal/:path*',
    '/announcements/:path*',
    '/calendar/:path*',
    '/messages/:path*',
    '/surveys/:path*',
    '/library/:path*',
  ],
};
