'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AcademicYear } from '@eduapp/shared-types';

async function fetchAcademicYears(): Promise<AcademicYear[]> {
  const res = await fetch('/api/academic/years');
  if (!res.ok) throw new Error('No se pudieron cargar los años lectivos');
  return res.json();
}

export interface CreateAcademicYearInput {
  name: string;
  startDate: string;
  endDate: string;
}

async function createAcademicYear(input: CreateAcademicYearInput): Promise<AcademicYear> {
  const res = await fetch('/api/academic/years', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear el año lectivo');
  return res.json();
}

export function useAcademicYears() {
  return useQuery({ queryKey: ['academic-years'], queryFn: fetchAcademicYears });
}

export function useCreateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAcademicYear,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export interface EditAcademicYearInput {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

async function editAcademicYear({ id, ...input }: EditAcademicYearInput): Promise<AcademicYear> {
  const res = await fetch(`/api/academic/years/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo editar el año lectivo');
  }
  return res.json();
}

export function useEditAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editAcademicYear,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

async function setAdmissionsOpen({ id, open }: { id: string; open: boolean }): Promise<AcademicYear> {
  const res = await fetch(`/api/academic/years/${id}/admissions`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ open }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo actualizar las admisiones de ese año');
  }
  return res.json();
}

export function useSetAdmissionsOpen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setAdmissionsOpen,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

async function deleteAcademicYear(id: string): Promise<void> {
  const res = await fetch(`/api/academic/years/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo eliminar el año lectivo');
  }
}

export function useDeleteAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAcademicYear,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}
