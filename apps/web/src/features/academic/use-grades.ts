'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Grade } from '@eduapp/shared-types';

async function fetchGrades(): Promise<Grade[]> {
  const res = await fetch('/api/academic/grades');
  if (!res.ok) throw new Error('No se pudieron cargar los grados');
  return res.json();
}

export interface CreateGradeInput {
  name: string;
  level: string;
  order: number;
}

async function createGrade(input: CreateGradeInput): Promise<Grade> {
  const res = await fetch('/api/academic/grades', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear el grado');
  return res.json();
}

export function useGrades() {
  return useQuery({ queryKey: ['grades'], queryFn: fetchGrades });
}

export function useCreateGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGrade,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grades'] }),
  });
}

export interface EditGradeInput {
  id: string;
  name: string;
  level: string;
  order: number;
}

async function editGrade({ id, ...input }: EditGradeInput): Promise<Grade> {
  const res = await fetch(`/api/academic/grades/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo editar el grado');
  }
  return res.json();
}

export function useEditGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editGrade,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grades'] }),
  });
}

async function deleteGrade(id: string): Promise<void> {
  const res = await fetch(`/api/academic/grades/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo eliminar el grado');
  }
}

export function useDeleteGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGrade,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grades'] }),
  });
}
