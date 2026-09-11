import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';

export async function PATCH() {
  const result = await serverApiFetch<{ ok: boolean }>('/notifications/read-all', { method: 'PATCH' });
  if (result === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(result);
}
