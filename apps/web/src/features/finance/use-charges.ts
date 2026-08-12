'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Charge, ChargeConcept, ChargeStatus, PaginatedResult } from '@eduapp/shared-types';

export interface ChargeFilter {
  enrollmentId?: string;
  concept?: ChargeConcept;
  status?: ChargeStatus;
}

export interface PaginatedChargeFilter extends ChargeFilter {
  page: number;
  pageSize: number;
}

async function fetchCharges(
  filter?: ChargeFilter | PaginatedChargeFilter,
): Promise<Charge[] | PaginatedResult<Charge>> {
  const qs = filter
    ? new URLSearchParams(filter as unknown as Record<string, string>).toString()
    : '';
  const res = await fetch(qs ? `/api/finance/charges?${qs}` : '/api/finance/charges');
  if (!res.ok) throw new Error('No se pudieron cargar los cargos');
  return res.json();
}

export interface CreateChargeInput {
  enrollmentId: string;
  concept: ChargeConcept;
  description: string;
  amount: number;
  dueDate: string;
  discountAmount?: number;
}

async function createCharge(input: CreateChargeInput): Promise<Charge> {
  const res = await fetch('/api/finance/charges', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear el cargo');
  return res.json();
}

export function useCharges(filter?: ChargeFilter): ReturnType<typeof useQuery<Charge[]>>;
export function useCharges(
  filter: PaginatedChargeFilter,
): ReturnType<typeof useQuery<PaginatedResult<Charge>>>;
export function useCharges(filter?: ChargeFilter | PaginatedChargeFilter) {
  return useQuery({
    queryKey: ['charges', filter ?? 'all'],
    queryFn: () => fetchCharges(filter),
  });
}

export function useCreateCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCharge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      toast.success('Cargo creado.');
    },
  });
}

export interface EditChargeInput {
  id: string;
  amount: number;
  description: string;
  dueDate: string;
  discountAmount?: number;
}

async function editCharge({ id, ...input }: EditChargeInput): Promise<Charge> {
  const res = await fetch(`/api/finance/charges/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo editar el cargo');
  return res.json();
}

async function voidCharge(id: string): Promise<Charge> {
  const res = await fetch(`/api/finance/charges/${id}/void`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo anular el cargo');
  return res.json();
}

export function useEditCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editCharge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charges'] }),
  });
}

export function useVoidCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidCharge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charges'] }),
  });
}
