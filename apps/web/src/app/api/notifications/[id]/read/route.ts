import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Notification } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const notification = await serverApiFetch<Notification>(`/notifications/${params.id}/read`, { method: 'PATCH' });
  if (notification === null) {
    return NextResponse.json({ message: 'No se pudo marcar como leída' }, { status: 400 });
  }
  return NextResponse.json(notification);
}
