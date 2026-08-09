'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Section } from '@eduapp/shared-types';

async function fetchSections(): Promise<Section[]> {
  const res = await fetch('/api/academic/sections');
  if (!res.ok) throw new Error('No se pudieron cargar las secciones');
  return res.json();
}

export interface CreateSectionInput {
  gradeId: string;
  name: string;
}

async function createSection(input: CreateSectionInput): Promise<Section> {
  const res = await fetch('/api/academic/sections', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear la sección');
  return res.json();
}

export function useSections() {
  return useQuery({ queryKey: ['sections'], queryFn: fetchSections });
}

export function useCreateSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections'] }),
  });
}
