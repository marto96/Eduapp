import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { DocumentTypePrice } from '@eduapp/shared-types';

export async function GET() {
  const prices = await serverApiFetch<DocumentTypePrice[]>('/documents/types/prices');
  if (prices === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(prices);
}
