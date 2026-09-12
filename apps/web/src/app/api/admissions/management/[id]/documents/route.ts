import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AdmissionDocument } from '@eduapp/shared-types';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const documents = await serverApiFetch<AdmissionDocument[]>(`/admissions/applications/${params.id}/documents`);
  if (documents === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(documents);
}
