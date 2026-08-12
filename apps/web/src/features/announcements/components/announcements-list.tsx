'use client';

import { useEffect, useState } from 'react';
import {
  useAnnouncements,
  useEditAnnouncement,
  useVoidAnnouncement,
  useMarkAnnouncementRead,
  useAnnouncementReaders,
} from '../use-announcements';
import { useUsers } from '@/features/users/use-users';
import { useSections } from '@/features/academic/use-sections';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Announcement } from '@eduapp/shared-types';

const CATEGORY_LABELS: Record<string, string> = {
  comunicado: 'Comunicado',
  circular: 'Circular',
  aviso: 'Aviso',
};

function AnnouncementReadersBadge({ announcementId }: { announcementId: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data: readers } = useAnnouncementReaders(announcementId, expanded);

  return (
    <div className="mt-2 text-xs text-muted-foreground">
      <button type="button" className="underline" onClick={() => setExpanded((v) => !v)}>
        {expanded ? 'Ocultar lectores' : 'Ver quién lo vio'}
      </button>
      {expanded && (
        <ul className="mt-1 space-y-0.5">
          {readers?.length === 0 && <li>Todavía nadie lo vio.</li>}
          {readers?.map((r) => (
            <li key={r.userId}>
              {r.fullName} — {new Date(r.readAt).toLocaleString('es-AR')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AnnouncementsList({ canManage = false }: { canManage?: boolean }) {
  const { data: announcements, isLoading, error } = useAnnouncements();
  const { data: users } = useUsers();
  const { data: sections } = useSections();
  const editAnnouncement = useEditAnnouncement();
  const voidAnnouncement = useVoidAnnouncement();
  const markRead = useMarkAnnouncementRead();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sectionId, setSectionId] = useState('');

  useEffect(() => {
    announcements?.forEach((a) => markRead.mutate(a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements?.map((a) => a.id).join(',')]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los comunicados.</p>;
  if (!announcements || announcements.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay comunicados publicados.</p>;
  }

  const userNameById = new Map(users?.map((u) => [u.id, u.fullName]));
  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));

  function startEditing(announcement: Announcement) {
    setEditingId(announcement.id);
    setTitle(announcement.title);
    setBody(announcement.body);
    setSectionId(announcement.sectionId ?? '');
  }

  function saveEdit(id: string) {
    if (!title.trim() || !body.trim()) return;
    editAnnouncement.mutate(
      { id, title, body, sectionId: sectionId || undefined },
      { onSuccess: () => setEditingId(null) },
    );
  }

  return (
    <ul className="space-y-2">
      {announcements.map((announcement) => {
        const isEditing = editingId === announcement.id;
        return (
          <Card key={announcement.id} className="py-3">
            {isEditing ? (
              <div className="space-y-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="flex w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="flex h-10 w-56 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="">Institucional (todos)</option>
                  {sections?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={editAnnouncement.isPending}
                    onClick={() => saveEdit(announcement.id)}
                  >
                    Guardar
                  </Button>
                  <Button variant="ghost" type="button" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {CATEGORY_LABELS[announcement.category] ?? announcement.category} — {announcement.title}
                    {announcement.sectionId && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({sectionNameById.get(announcement.sectionId) ?? 'sección'})
                      </span>
                    )}
                    {announcement.editedAt && (
                      <span className="ml-2 text-xs text-muted-foreground" title={announcement.editedAt}>
                        (editado)
                      </span>
                    )}
                    {announcement.voidedAt && (
                      <span className="ml-2 text-xs uppercase text-destructive">Anulado</span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{announcement.body}</p>
                  {canManage && !announcement.voidedAt && (
                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline hover:text-foreground"
                        onClick={() => startEditing(announcement)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-xs text-destructive underline"
                        disabled={voidAnnouncement.isPending}
                        onClick={() => voidAnnouncement.mutate(announcement.id)}
                      >
                        Anular
                      </button>
                    </div>
                  )}
                  {canManage && <AnnouncementReadersBadge announcementId={announcement.id} />}
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <p>{announcement.publishedAt}</p>
                  <p>{userNameById.get(announcement.publishedBy) ?? announcement.publishedBy}</p>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </ul>
  );
}
