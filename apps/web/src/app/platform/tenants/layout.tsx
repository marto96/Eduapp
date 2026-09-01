import { redirect } from 'next/navigation';
import { getCurrentPlatformAdmin } from '@/lib/platform-api';
import { PlatformLogoutButton } from '@/components/platform-logout-button';
import { PlatformNavLinks } from '@/components/platform-nav-links';
import { PlatformPageTitle } from '@/components/platform-page-title';
import { InstitutionSwitcher } from '@/features/platform-tenants/components/institution-switcher';

export default async function PlatformTenantsLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) redirect('/platform/login');

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <span className="truncate text-sm font-medium">Skolaria · Plataforma</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <PlatformNavLinks />
        </div>
        <div className="border-t border-border p-3">
          <PlatformLogoutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-3">
          <PlatformPageTitle />
          <div className="flex items-center gap-3">
            <InstitutionSwitcher />
            <p className="text-xs text-muted-foreground">{admin.email}</p>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
