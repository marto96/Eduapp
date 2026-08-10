'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DayOfWeek, Schedule } from '@eduapp/shared-types';

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
