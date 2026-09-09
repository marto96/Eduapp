import { NextResponse } from 'next/server';
import { platformApiFetchWithStatus } from '@/lib/platform-api';

export async function POST(_req: Request, { params }: { params: { id: string; userId: string } }) {
  const { status, body } = await platformApiFetchWithStatus<{ handoffUrl: string }>(
    `/platform/tenants/${params.id}/users/${params.userId}/impersonate`,
    { method: 'POST' },
  );
  if (status < 200 || status >= 300) {
    const message = (body as { message?: string } | null)?.message ?? 'No se pudo iniciar la impersonación';
    return NextResponse.json({ message }, { status });
  }
  return NextResponse.json(body);
}
