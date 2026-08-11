import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GuardianLink } from '@eduapp/shared-types';

export async function GET() {
  const links = await serverApiFetch<GuardianLink[]>('/guardians/mine');
  if (links === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(links);
}
