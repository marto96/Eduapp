import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Notification } from '@eduapp/shared-types';

export async function GET() {
  const notifications = await serverApiFetch<Notification[]>('/notifications');
  if (notifications === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(notifications);
}
