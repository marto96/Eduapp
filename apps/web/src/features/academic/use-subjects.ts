'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Subject } from '@eduapp/shared-types';

async function fetchSubjects(): Promise<Subject[]> {
  const res = await fetch('/api/academic/subjects');
  if (!res.ok) throw new Error('No se pudieron cargar las asignaturas');
  return res.json();
}

export interface CreateSubjectInput {
  name: string;
  area: string;
}

async function createSubject(input: CreateSubjectInput): Promise<Subject> {
  const res = await fetch('/api/academic/subjects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear la asignatura');
  return res.json();
}

export function useSubjects() {
  return useQuery({ queryKey: ['subjects'], queryFn: fetchSubjects });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  });
}
