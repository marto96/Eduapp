import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { AnnouncementReader } from '@eduapp/shared-types';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const readers = await serverApiFetch<AnnouncementReader[]>(`/announcements/${params.id}/reads`);
  if (readers === null) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  return NextResponse.json(readers);
}
