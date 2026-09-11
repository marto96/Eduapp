import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GuardianLinkCandidate } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const candidates = await serverApiFetch<GuardianLinkCandidate[]>(`/guardians/candidates${qs ? `?${qs}` : ''}`);
  if (candidates === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(candidates);
}
