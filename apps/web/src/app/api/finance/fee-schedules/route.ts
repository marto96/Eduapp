import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { serverApiFetch } from '@/lib/server-api';
import type { FeeSchedule } from '@eduapp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SUBDOMAIN = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN ?? '';

export async function GET() {
  const feeSchedules = await serverApiFetch<FeeSchedule[]>('/finance/fee-schedules');
  if (feeSchedules === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(feeSchedules);
}

// Fetch directo (no `serverApiFetch`): igual que en `finance/charges/route.ts`,
// para que un `ConflictException` puntual (precio ya configurado) llegue con
// su mensaje real a la UI.
export async function POST(req: NextRequest) {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const apiRes = await fetch(`${API_URL}/finance/fee-schedules`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      'x-tenant-subdomain': TENANT_SUBDOMAIN,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const responseBody = await apiRes.json().catch(() => null);
    const message = responseBody?.message ?? 'No se pudo crear el precio';
    return NextResponse.json({ message }, { status: apiRes.status });
  }

  const feeSchedule = (await apiRes.json()) as FeeSchedule;
  return NextResponse.json(feeSchedule, { status: 201 });
}
