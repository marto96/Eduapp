'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Survey, SurveyResults } from '@eduapp/shared-types';

async function fetchSurveys(): Promise<Survey[]> {
  const res = await fetch('/api/surveys');
  if (!res.ok) throw new Error('No se pudieron cargar las encuestas');
  return res.json();
}

export interface CreateSurveyQuestionInput {
  text: string;
  options: string[];
}

export interface CreateSurveyInput {
  questions: CreateSurveyQuestionInput[];
  closesAt?: string;
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

export interface SurveyAnswerInput {
  questionId: string;
  selectedOption: string;
}

export interface SubmitSurveyResponseInput {
  surveyId: string;
  answers: SurveyAnswerInput[];
}

async function submitSurveyResponse({ surveyId, answers }: SubmitSurveyResponseInput): Promise<void> {
  const res = await fetch(`/api/surveys/${surveyId}/responses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error('No se pudo enviar la respuesta');
}

async function fetchSurveyResults(surveyId: string): Promise<SurveyResults> {
  const res = await fetch(`/api/surveys/${surveyId}/results`);
  if (!res.ok) throw new Error('No se pudieron cargar los resultados');
  return res.json();
}

async function rescheduleSurvey({
  surveyId,
  closesAt,
}: {
  surveyId: string;
  closesAt?: string;
}): Promise<Survey> {
  const res = await fetch(`/api/surveys/${surveyId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ closesAt }),
  });
  if (!res.ok) throw new Error('No se pudo actualizar la fecha de cierre');
  return res.json();
}

async function voidSurvey(surveyId: string): Promise<Survey> {
  const res = await fetch(`/api/surveys/${surveyId}/void`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo anular la encuesta');
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

export function useRescheduleSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rescheduleSurvey,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-results', variables.surveyId] });
    },
  });
}

export function useVoidSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidSurvey,
    onSuccess: (_data, surveyId) => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-results', surveyId] });
    },
  });
}
