'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function IcsFeedButton() {
  const [copied, setCopied] = useState(false);
  const feedUrl = `${API_URL}/calendar/feed.ics`;

  async function handleCopy() {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" onClick={handleCopy}>
        {copied ? 'Enlace copiado' : 'Agregar a mi calendario'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Suscribí este enlace en Google Calendar, Apple Calendar o similar — solo eventos
        institucionales.
      </p>
    </div>
  );
}
