'use client';

import { FormEvent, useState } from 'react';
import { usePublishAnnouncement } from '../use-announcements';
import { useSections } from '@/features/academic/use-sections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { AnnouncementCategory } from '@eduapp/shared-types';

const CATEGORIES: { value: AnnouncementCategory; label: string }[] = [
  { value: 'comunicado', label: 'Comunicado' },
  { value: 'circular', label: 'Circular' },
  { value: 'aviso', label: 'Aviso' },
];

export function PublishAnnouncementForm() {
  const publishAnnouncement = usePublishAnnouncement();
  const { data: sections } = useSections();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('comunicado');
  const [body, setBody] = useState('');
  const [publishedAt, setPublishedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [sectionId, setSectionId] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title || !body || !publishedAt) return;
    publishAnnouncement.mutate(
      { title, body, category, publishedAt, sectionId: sectionId || undefined },
      {
        onSuccess: () => {
          setTitle('');
          setBody('');
          setSectionId('');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 space-y-1.5" style={{ minWidth: '16rem' }}>
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            placeholder="Suspensión de clases el viernes"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Categoría</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
            className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="publishedAt">Fecha</Label>
          <Input
            id="publishedAt"
            type="date"
            className="w-40"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sectionId">Sección (opcional, vacío = institucional)</Label>
          <select
            id="sectionId"
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
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">Contenido</Label>
        <textarea
          id="body"
          required
          rows={3}
          placeholder="Detalle del comunicado..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={cn(
            'flex w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary',
          )}
        />
      </div>
      <Button type="submit" disabled={publishAnnouncement.isPending}>
        {publishAnnouncement.isPending ? 'Publicando...' : 'Publicar comunicado'}
      </Button>
      {publishAnnouncement.isError && (
        <p className="text-sm text-destructive">No se pudo publicar el comunicado.</p>
      )}
    </form>
  );
}
