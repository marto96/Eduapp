'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Announcement, AnnouncementCategory, AnnouncementReader } from '@eduapp/shared-types';

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

async function markAnnouncementRead(id: string): Promise<void> {
  const res = await fetch(`/api/announcements/${id}/read`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo marcar como leído');
}

async function fetchAnnouncementReaders(id: string): Promise<AnnouncementReader[]> {
  const res = await fetch(`/api/announcements/${id}/reads`);
  if (!res.ok) throw new Error('No se pudieron cargar los lectores');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Comunicado publicado.');
    },
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

export function useMarkAnnouncementRead() {
  return useMutation({ mutationFn: markAnnouncementRead });
}

export function useAnnouncementReaders(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['announcements', id, 'reads'],
    queryFn: () => fetchAnnouncementReaders(id),
    enabled,
  });
}
