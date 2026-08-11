'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Event } from '@eduapp/shared-types';

async function fetchEvents(): Promise<Event[]> {
  const res = await fetch('/api/events');
  if (!res.ok) throw new Error('No se pudieron cargar los eventos');
  return res.json();
}

export interface CreateEventInput {
  title: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  sectionId?: string;
}

async function createEvent(input: CreateEventInput): Promise<Event> {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear el evento');
  return res.json();
}

export interface EditEventInput {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  sectionId?: string;
}

async function editEvent({ id, ...input }: EditEventInput): Promise<Event> {
  const res = await fetch(`/api/events/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo editar el evento');
  return res.json();
}

async function voidEvent(id: string): Promise<Event> {
  const res = await fetch(`/api/events/${id}/void`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo anular el evento');
  return res.json();
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useEditEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useVoidEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });
}
