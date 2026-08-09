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
