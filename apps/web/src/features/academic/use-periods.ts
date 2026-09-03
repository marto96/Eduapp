'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Period } from '@eduapp/shared-types';

export interface PeriodFilter {
  academicYearId?: string;
}

async function fetchPeriods(filter?: PeriodFilter): Promise<Period[]> {
  const qs = filter?.academicYearId ? `?academicYearId=${filter.academicYearId}` : '';
  const res = await fetch(`/api/academic/periods${qs}`);
  if (!res.ok) throw new Error('No se pudieron cargar los periodos');
  return res.json();
}

export interface CreatePeriodInput {
  academicYearId: string;
  name: string;
  order: number;
  weight: number;
  startDate: string;
  endDate: string;
}

async function createPeriod(input: CreatePeriodInput): Promise<Period> {
  const res = await fetch('/api/academic/periods', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo crear el periodo');
  }
  return res.json();
}

export interface EditPeriodInput {
  id: string;
  name: string;
  order: number;
  weight: number;
  startDate: string;
  endDate: string;
}

async function editPeriod({ id, ...input }: EditPeriodInput): Promise<Period> {
  const res = await fetch(`/api/academic/periods/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo editar el periodo');
  }
  return res.json();
}

export function usePeriods(filter?: PeriodFilter) {
  return useQuery({
    queryKey: ['periods', filter ?? 'all'],
    queryFn: () => fetchPeriods(filter),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPeriod,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['periods'] }),
  });
}

export function useEditPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editPeriod,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['periods'] }),
  });
}
