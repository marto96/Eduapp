'use client';

import { useQuery } from '@tanstack/react-query';
import type { AttendanceRecord, GradeScore } from '@eduapp/shared-types';

async function fetchAllAttendance(): Promise<AttendanceRecord[]> {
  const res = await fetch('/api/attendance');
  if (!res.ok) throw new Error('No se pudo cargar la asistencia');
  return res.json();
}

async function fetchAllScores(): Promise<GradeScore[]> {
  const res = await fetch('/api/grading/scores');
  if (!res.ok) throw new Error('No se pudieron cargar las notas');
  return res.json();
}

/** Sin filtro: el backend ya devuelve solo lo que este usuario puede ver. */
export function usePortalAttendance() {
  return useQuery({ queryKey: ['portal-attendance'], queryFn: fetchAllAttendance });
}

export function usePortalScores() {
  return useQuery({ queryKey: ['portal-scores'], queryFn: fetchAllScores });
}
