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
