import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has('access_token');

  if (!hasSession) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
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
  ],
};
