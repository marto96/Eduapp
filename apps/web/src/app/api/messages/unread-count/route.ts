import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';

export async function GET() {
  const result = await serverApiFetch<{ count: number }>('/messages/unread-count');
  if (result === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(result);
}
