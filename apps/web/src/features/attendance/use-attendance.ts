'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AttendanceRecord, AttendanceStatus } from '@eduapp/shared-types';

export interface AttendanceFilter {
  scheduleId: string;
  date: string;
}

async function fetchAttendance(filter: AttendanceFilter): Promise<AttendanceRecord[]> {
  const qs = new URLSearchParams(filter as unknown as Record<string, string>).toString();
  const res = await fetch(`/api/attendance?${qs}`);
  if (!res.ok) throw new Error('No se pudo cargar la asistencia');
  return res.json();
}

export interface RecordAttendanceInput {
  scheduleId: string;
  date: string;
  records: { enrollmentId: string; status: AttendanceStatus }[];
}

async function recordAttendance(input: RecordAttendanceInput): Promise<AttendanceRecord[]> {
  const res = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo guardar la asistencia');
  return res.json();
}

export function useAttendance(filter: AttendanceFilter, enabled: boolean) {
  return useQuery({
    queryKey: ['attendance', filter],
    queryFn: () => fetchAttendance(filter),
    enabled,
  });
}

async function fetchMyAttendance(): Promise<AttendanceRecord[]> {
  const res = await fetch('/api/attendance');
  if (!res.ok) throw new Error('No se pudo cargar la asistencia');
  return res.json();
}

/** Sin filtro: el backend ya devuelve solo la asistencia que este usuario puede ver. */
export function useMyAttendance() {
  return useQuery({ queryKey: ['my-attendance'], queryFn: fetchMyAttendance });
}

export function useRecordAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordAttendance,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });
}
