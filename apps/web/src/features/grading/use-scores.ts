'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GradeScore } from '@eduapp/shared-types';

async function fetchScores(evaluationId: string): Promise<GradeScore[]> {
  const res = await fetch(`/api/grading/scores?evaluationId=${evaluationId}`);
  if (!res.ok) throw new Error('No se pudieron cargar las notas');
  return res.json();
}

export interface RecordScoresInput {
  evaluationId: string;
  scores: { enrollmentId: string; score: number }[];
}

async function recordScores(input: RecordScoresInput): Promise<GradeScore[]> {
  const res = await fetch('/api/grading/scores', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudieron guardar las notas');
  return res.json();
}

export function useScores(evaluationId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['scores', evaluationId],
    queryFn: () => fetchScores(evaluationId),
    enabled,
  });
}

export function useRecordScores() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordScores,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scores'] }),
  });
}
