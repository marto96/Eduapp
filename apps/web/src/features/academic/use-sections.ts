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

export interface EditSectionInput {
  id: string;
  name: string;
}

async function editSection({ id, name }: EditSectionInput): Promise<Section> {
  const res = await fetch(`/api/academic/sections/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo editar la sección');
  }
  return res.json();
}

export function useEditSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editSection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections'] }),
  });
}

async function deleteSection(id: string): Promise<void> {
  const res = await fetch(`/api/academic/sections/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo eliminar la sección');
  }
}

export function useDeleteSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections'] }),
  });
}
