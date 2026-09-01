'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ChargeConcept, FeeSchedule } from '@eduapp/shared-types';

async function fetchFeeSchedules(): Promise<FeeSchedule[]> {
  const res = await fetch('/api/finance/fee-schedules');
  if (!res.ok) throw new Error('No se pudieron cargar los precios');
  return res.json();
}

export interface CreateFeeScheduleInput {
  gradeId: string;
  academicYearId: string;
  concept: ChargeConcept;
  amount: number;
}

async function createFeeSchedule(input: CreateFeeScheduleInput): Promise<FeeSchedule> {
  const res = await fetch('/api/finance/fee-schedules', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo crear el precio');
  }
  return res.json();
}

export interface EditFeeScheduleInput {
  id: string;
  amount: number;
}

async function editFeeSchedule({ id, ...input }: EditFeeScheduleInput): Promise<FeeSchedule> {
  const res = await fetch(`/api/finance/fee-schedules/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo editar el precio');
  }
  return res.json();
}

export function useFeeSchedules() {
  return useQuery({ queryKey: ['fee-schedules'], queryFn: fetchFeeSchedules });
}

export function useCreateFeeSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFeeSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-schedules'] });
      toast.success('Precio guardado.');
    },
  });
}

export function useEditFeeSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editFeeSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-schedules'] });
      toast.success('Precio actualizado.');
    },
  });
}
