import { NextRequest, NextResponse } from 'next/server';
import { platformApiFetch } from '@/lib/platform-api';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await platformApiFetch<{ success: true }>('/platform/auth/2fa/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (result === null) {
    return NextResponse.json({ message: 'Código inválido' }, { status: 400 });
  }
  return NextResponse.json(result);
}
