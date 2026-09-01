'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DayOfWeek, Schedule, VirtualRoom } from '@eduapp/shared-types';

export interface ScheduleFilter {
  sectionId?: string;
  teacherId?: string;
  academicYearId?: string;
  dayOfWeek?: DayOfWeek;
}

async function fetchSchedules(filter?: ScheduleFilter): Promise<Schedule[]> {
  const qs = filter
    ? new URLSearchParams(filter as unknown as Record<string, string>).toString()
    : '';
  const res = await fetch(qs ? `/api/schedule?${qs}` : '/api/schedule');
  if (!res.ok) throw new Error('No se pudieron cargar los horarios');
  return res.json();
}

export interface CreateScheduleInput {
  sectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

async function createSchedule(input: CreateScheduleInput): Promise<Schedule> {
  const res = await fetch('/api/schedule', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear el horario');
  return res.json();
}

export function useSchedules(filter?: ScheduleFilter) {
  return useQuery({
    queryKey: ['schedules', filter ?? 'all'],
    queryFn: () => fetchSchedules(filter),
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

export interface SetScheduleVirtualInput {
  id: string;
  isVirtual: boolean;
}

async function setScheduleVirtual({ id, isVirtual }: SetScheduleVirtualInput): Promise<Schedule> {
  const res = await fetch(`/api/schedule/${id}/virtual`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ isVirtual }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo actualizar la clase virtual');
  }
  return res.json();
}

export function useSetScheduleVirtual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setScheduleVirtual,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

async function fetchVirtualRoom(scheduleId: string): Promise<VirtualRoom> {
  const res = await fetch(`/api/schedule/${scheduleId}/virtual-room`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo obtener la sala');
  }
  return res.json();
}

export function useJoinVirtualClass() {
  return useMutation({
    mutationFn: fetchVirtualRoom,
  });
}
