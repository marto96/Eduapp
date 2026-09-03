'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Evaluation, GradeCategory } from '@eduapp/shared-types';

export interface EvaluationFilter {
  sectionId?: string;
  academicYearId?: string;
  subjectId?: string;
  periodId?: string;
  category?: GradeCategory;
}

async function fetchEvaluations(filter?: EvaluationFilter): Promise<Evaluation[]> {
  const qs = filter
    ? new URLSearchParams(filter as unknown as Record<string, string>).toString()
    : '';
  const res = await fetch(qs ? `/api/grading/evaluations?${qs}` : '/api/grading/evaluations');
  if (!res.ok) throw new Error('No se pudieron cargar las evaluaciones');
  return res.json();
}

export interface CreateEvaluationInput {
  subjectId: string;
  sectionId: string;
  academicYearId: string;
  periodId: string;
  category: GradeCategory;
  maxScore?: number;
  label?: string;
}

async function createEvaluation(input: CreateEvaluationInput): Promise<Evaluation> {
  const res = await fetch('/api/grading/evaluations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear la evaluación');
  return res.json();
}

export function useEvaluations(filter?: EvaluationFilter) {
  return useQuery({
    queryKey: ['evaluations', filter ?? 'all'],
    queryFn: () => fetchEvaluations(filter),
  });
}

export function useCreateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEvaluation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluations'] }),
  });
}
