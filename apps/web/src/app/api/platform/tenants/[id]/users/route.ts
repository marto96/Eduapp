import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetchWithStatus } from '@/lib/platform-api';
import type { PaginatedResult, TenantUser } from '@eduapp/shared-types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const qs = req.nextUrl.searchParams.toString();
  const { status, body } = await platformApiFetchWithStatus<PaginatedResult<TenantUser>>(
    `/platform/tenants/${params.id}/users${qs ? `?${qs}` : ''}`,
  );
  if (status < 200 || status >= 300) {
    const message = (body as { message?: string } | null)?.message ?? 'No se pudieron cargar los usuarios';
    return NextResponse.json({ message }, { status });
  }
  return NextResponse.json(body);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const reqBody = await req.json();
  const { status, body } = await platformApiFetchWithStatus<TenantUser>(`/platform/tenants/${params.id}/users`, {
    method: 'POST',
    body: JSON.stringify(reqBody),
  });
  if (status < 200 || status >= 300) {
    const message = (body as { message?: string } | null)?.message ?? 'No se pudo crear el usuario';
    return NextResponse.json({ message }, { status });
  }
  return NextResponse.json(body, { status: 201 });
}
