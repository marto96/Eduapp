'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GradeWeightConfig } from '@eduapp/shared-types';

async function fetchGradeWeightConfig(): Promise<GradeWeightConfig> {
  const res = await fetch('/api/grading/weight-config');
  if (!res.ok) throw new Error('No se pudo cargar la configuración de pesos');
  return res.json();
}

export interface EditGradeWeightConfigInput {
  actividadWeight: number;
  evaluacionBimestralWeight: number;
  disciplinaWeight: number;
}

async function editGradeWeightConfig(input: EditGradeWeightConfigInput): Promise<GradeWeightConfig> {
  const res = await fetch('/api/grading/weight-config', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo actualizar la configuración');
  }
  return res.json();
}

export function useGradeWeightConfig() {
  return useQuery({
    queryKey: ['grade-weight-config'],
    queryFn: fetchGradeWeightConfig,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEditGradeWeightConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editGradeWeightConfig,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grade-weight-config'] }),
  });
}
