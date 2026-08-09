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
