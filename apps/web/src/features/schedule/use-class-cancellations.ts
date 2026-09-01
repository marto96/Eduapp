'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClassCancellation } from '@eduapp/shared-types';

export interface ClassCancellationFilter {
  sectionId?: string;
  teacherId?: string;
  from: string;
  to: string;
}

async function fetchClassCancellations(filter: ClassCancellationFilter): Promise<ClassCancellation[]> {
  const qs = new URLSearchParams(filter as unknown as Record<string, string>).toString();
  const res = await fetch(`/api/schedule/cancellations?${qs}`);
  if (!res.ok) throw new Error('No se pudieron cargar las cancelaciones');
  return res.json();
}

export function useClassCancellations(filter: ClassCancellationFilter) {
  return useQuery({
    queryKey: ['class-cancellations', filter],
    queryFn: () => fetchClassCancellations(filter),
  });
}

export interface CancelClassSessionInput {
  scheduleId: string;
  date: string;
  reason?: string;
}

async function cancelClassSession(input: CancelClassSessionInput): Promise<ClassCancellation> {
  const res = await fetch(`/api/schedule/${input.scheduleId}/cancellations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ date: input.date, reason: input.reason }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo cancelar la clase');
  }
  return res.json();
}

export function useCancelClassSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelClassSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['class-cancellations'] }),
  });
}

async function uncancelClassSession(cancellationId: string): Promise<void> {
  const res = await fetch(`/api/schedule/cancellations/${cancellationId}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo revertir la cancelación');
  }
}

export function useUncancelClassSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uncancelClassSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['class-cancellations'] }),
  });
}
