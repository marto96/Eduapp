'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Leave, LeaveType } from '@eduapp/shared-types';

export interface LeaveFilter {
  employeeId?: string;
}

async function fetchLeaves(filter?: LeaveFilter): Promise<Leave[]> {
  const qs = filter ? new URLSearchParams(filter as Record<string, string>).toString() : '';
  const res = await fetch(qs ? `/api/hr/leaves?${qs}` : '/api/hr/leaves');
  if (!res.ok) throw new Error('No se pudieron cargar las licencias');
  return res.json();
}

export interface CreateLeaveInput {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

async function createLeave(input: CreateLeaveInput): Promise<Leave> {
  const res = await fetch('/api/hr/leaves', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo cargar la licencia');
  return res.json();
}

export function useLeaves(filter?: LeaveFilter) {
  return useQuery({
    queryKey: ['leaves', filter ?? 'all'],
    queryFn: () => fetchLeaves(filter),
  });
}

export function useCreateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLeave,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] }),
  });
}
