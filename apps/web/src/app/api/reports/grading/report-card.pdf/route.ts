import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET(req: NextRequest) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const qs = req.nextUrl.searchParams.toString();
  const apiRes = await fetch(`${API_URL}/reports/grading/report-card.pdf?${qs}`, {
    headers: { authorization: `Bearer ${accessToken}`, 'x-tenant-subdomain': TENANT_SUBDOMAIN },
  });

  if (!apiRes.ok) {
    return NextResponse.json({ message: 'No se pudo generar el boletín' }, { status: apiRes.status });
  }

  return new Response(apiRes.body, {
    headers: {
      'Content-Type': apiRes.headers.get('content-type') ?? 'application/pdf',
      'Content-Disposition': apiRes.headers.get('content-disposition') ?? 'inline',
    },
  });
}
