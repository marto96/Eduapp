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
 * Señal que el frontend (ver `providers.tsx`) usa para distinguir "sesión
 * realmente muerta" de un 401/403 cualquiera devuelto por una ruta BFF
 * (que a veces mezcla ambos códigos sin distinguir motivo — ver
 * `serverApiFetch`). Solo esta respuesta puntual, generada acá antes de
 * que la request llegue a ningún route handler, dispara la redirección
 * automática a `/login`.
 */
const SESSION_EXPIRED_HEADER = 'x-session-expired';

/**
 * `/api/auth/*` maneja su propio ciclo de cookies (login/logout/el refresh
 * que este mismo middleware ya dispara) — nunca debe pasar por acá, si no
 * un logout con sesión ya vencida quedaría bloqueado antes de poder borrar
 * las cookies. `/api/platform/*` es la sesión de superadmin, cookie
 * distinta (`platform_access_token`), este middleware no la toca.
 * `/api/public/*` y `/api/admissions/applications*` (crear solicitud +
 * consultar estado) son rutas BFF sin sesión a propósito — un aspirante
 * anónimo nunca tiene `access_token`/`refresh_token`, así que sin este
 * bypass este middleware las devolvía siempre 401 antes de que llegaran a
 * su route handler, dejando el formulario público de admisión inservible.
 * `/api/admissions/management/*` (el panel de staff) NO se agrega acá:
 * esas rutas sí requieren sesión, el bypass es solo para el tramo público.
 */
function isBypassedApiRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/platform/') ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/admissions/applications')
  );
}

/**
 * El cookie `access_token` no tiene `maxAge` (dura toda la sesión del
 * navegador), así que sigue "presente" mucho después de que el JWT que
 * contiene expiró (15 min) — por eso no alcanza con chequear que exista,
 * hay que decodificar el `exp`. Si expiró pero hay `refresh_token`, se pide
 * un par nuevo a `POST /auth/refresh` de forma transparente antes de dejar
 * pasar el request — así la sesión no se corta cada 15 minutos.
 *
 * Corre tanto para páginas como para las rutas BFF `/api/*` (agregado para
 * que el polling en background — ej. no-leídos cada 20s — también refresque
 * la sesión en vez de solo hacerlo en la próxima navegación; sin esto, una
 * pestaña abierta y sin interacción del usuario podía quedar con fetches
 * fallando en silencio hasta el próximo click). Para páginas, una sesión
 * sin refresh token válido redirige a `/login`; para `/api/*`, se devuelve
 * un 401 con el header `x-session-expired` — un redirect real ahí solo
 * confundiría al `fetch()` que lo llamó, no navega el browser.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');
  if (isApiRoute && isBypassedApiRoute(pathname)) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get('access_token')?.value;
  if (isAccessTokenValid(accessToken)) {
    return NextResponse.next();
  }

  const refreshToken = req.cookies.get('refresh_token')?.value;

  function unauthorized(): NextResponse {
    if (isApiRoute) {
      const res = NextResponse.json(
        { message: 'Sesión expirada' },
        { status: 401, headers: { [SESSION_EXPIRED_HEADER]: '1' } },
      );
      res.cookies.delete('access_token');
      res.cookies.delete('refresh_token');
      return res;
    }
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.cookies.delete('access_token');
    res.cookies.delete('refresh_token');
    return res;
  }

  if (!refreshToken) {
    return unauthorized();
  }

  try {
    const apiRes = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-tenant-subdomain': TENANT_SUBDOMAIN },
      body: JSON.stringify({ refreshToken }),
    });

    if (!apiRes.ok) {
      return unauthorized();
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
    return unauthorized();
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
    '/admissions/:path*',
    '/calendar/:path*',
    '/messages/:path*',
    '/surveys/:path*',
    '/library/:path*',
    '/audit/:path*',
    '/api/:path*',
  ],
};
