import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { ClassCancellation } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET(req: NextRequest) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const qs = req.nextUrl.searchParams.toString();
  const apiRes = await fetch(`${API_URL}/schedule/cancellations?${qs}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudieron cargar las cancelaciones';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const cancellations = (await apiRes.json()) as ClassCancellation[];
  return NextResponse.json(cancellations);
}
