'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Announcement, AnnouncementCategory } from '@eduapp/shared-types';

export interface AnnouncementFilter {
  category?: AnnouncementCategory;
}

async function fetchAnnouncements(filter?: AnnouncementFilter): Promise<Announcement[]> {
  const qs = filter ? new URLSearchParams(filter as Record<string, string>).toString() : '';
  const res = await fetch(qs ? `/api/announcements?${qs}` : '/api/announcements');
  if (!res.ok) throw new Error('No se pudieron cargar los comunicados');
  return res.json();
}

export interface PublishAnnouncementInput {
  title: string;
  body: string;
  category: AnnouncementCategory;
  publishedAt: string;
  sectionId?: string;
}

async function publishAnnouncement(input: PublishAnnouncementInput): Promise<Announcement> {
  const res = await fetch('/api/announcements', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo publicar el comunicado');
  return res.json();
}

export interface EditAnnouncementInput {
  id: string;
  title: string;
  body: string;
  sectionId?: string;
}

async function editAnnouncement({ id, ...input }: EditAnnouncementInput): Promise<Announcement> {
  const res = await fetch(`/api/announcements/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo editar el comunicado');
  return res.json();
}

async function voidAnnouncement(id: string): Promise<Announcement> {
  const res = await fetch(`/api/announcements/${id}/void`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo anular el comunicado');
  return res.json();
}

export function useAnnouncements(filter?: AnnouncementFilter) {
  return useQuery({
    queryKey: ['announcements', filter ?? 'all'],
    queryFn: () => fetchAnnouncements(filter),
  });
}

export function usePublishAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publishAnnouncement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useEditAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editAnnouncement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useVoidAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidAnnouncement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });
}
