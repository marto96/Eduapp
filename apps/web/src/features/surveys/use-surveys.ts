'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Survey, SurveyResults } from '@eduapp/shared-types';

async function fetchSurveys(): Promise<Survey[]> {
  const res = await fetch('/api/surveys');
  if (!res.ok) throw new Error('No se pudieron cargar las encuestas');
  return res.json();
}

export interface CreateSurveyInput {
  question: string;
  options: string[];
}

async function createSurvey(input: CreateSurveyInput): Promise<Survey> {
  const res = await fetch('/api/surveys', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear la encuesta');
  return res.json();
}

export interface SubmitSurveyResponseInput {
  surveyId: string;
  selectedOption: string;
}

async function submitSurveyResponse({ surveyId, selectedOption }: SubmitSurveyResponseInput): Promise<void> {
  const res = await fetch(`/api/surveys/${surveyId}/responses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ selectedOption }),
  });
  if (!res.ok) throw new Error('No se pudo enviar la respuesta');
}

async function fetchSurveyResults(surveyId: string): Promise<SurveyResults> {
  const res = await fetch(`/api/surveys/${surveyId}/results`);
  if (!res.ok) throw new Error('No se pudieron cargar los resultados');
  return res.json();
}

export function useSurveys() {
  return useQuery({ queryKey: ['surveys'], queryFn: fetchSurveys });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSurvey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surveys'] }),
  });
}

export function useSurveyResults(surveyId: string) {
  return useQuery({
    queryKey: ['survey-results', surveyId],
    queryFn: () => fetchSurveyResults(surveyId),
  });
}

export function useSubmitSurveyResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitSurveyResponse,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['survey-results', variables.surveyId] });
    },
  });
}
