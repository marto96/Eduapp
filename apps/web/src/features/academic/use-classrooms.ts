'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Classroom } from '@eduapp/shared-types';

async function fetchClassrooms(): Promise<Classroom[]> {
  const res = await fetch('/api/academic/classrooms');
  if (!res.ok) throw new Error('No se pudieron cargar las aulas');
  return res.json();
}

export interface CreateClassroomInput {
  name: string;
  capacity: number;
}

async function createClassroom(input: CreateClassroomInput): Promise<Classroom> {
  const res = await fetch('/api/academic/classrooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear el aula');
  return res.json();
}

export function useClassrooms() {
  return useQuery({ queryKey: ['classrooms'], queryFn: fetchClassrooms });
}

export function useCreateClassroom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClassroom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}
