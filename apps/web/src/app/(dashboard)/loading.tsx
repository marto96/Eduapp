'use client';

import { useEffect, useState } from 'react';
import { readCachedBranding, type CachedBranding } from '@/lib/branding-cache';

/**
 * Loader de pantalla completa que Next.js muestra automáticamente durante
 * la transición entre páginas del dashboard (convención `loading.tsx` de
 * App Router). El logo sale de la caché en localStorage, no de un fetch
 * propio — ver `branding-cache.ts`.
 */
export default function DashboardLoading() {
  const [branding, setBranding] = useState<CachedBranding | null>(null);

  useEffect(() => {
    setBranding(readCachedBranding());
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
        <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-primary" />
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={branding.name} className="h-full w-full object-contain" />
          ) : (
            <span className="text-center text-[10px] font-medium leading-tight text-muted-foreground">
              {branding?.name ?? 'Skolaria'}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Cargando...</p>
    </div>
  );
}
