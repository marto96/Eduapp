'use client';

import { useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLinks } from '@/components/nav-links';
import { LogoutButton } from '@/components/logout-button';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TenantBranding } from '@/lib/server-api';
import { cacheBranding } from '@/lib/branding-cache';

const STORAGE_KEY = 'sidebar-collapsed';

export function Sidebar({ branding, roles }: { branding: TenantBranding; roles: string[] }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  // Para que el loader de pantalla completa (`(dashboard)/loading.tsx`)
  // pueda mostrar el logo sin tener que volver a pedirlo — ver el
  // comentario en `branding-cache.ts`.
  useEffect(() => {
    cacheBranding({ name: branding.name, logoUrl: branding.logoUrl });
  }, [branding.name, branding.logoUrl]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 border-b border-border px-4 py-4',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed &&
          (branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={branding.name}
              className="h-6 max-w-[7rem] object-contain"
            />
          ) : (
            <span className="truncate text-sm font-medium">{branding.name}</span>
          ))}
        <Button
          type="button"
          variant="secondary"
          className={cn('h-9 w-9 shrink-0 p-0', !collapsed && 'ml-auto')}
          onClick={toggle}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks roles={roles} collapsed={collapsed} />
      </div>
      <div className="border-t border-border p-3">
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
