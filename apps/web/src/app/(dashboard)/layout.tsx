import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { PageTitle } from '@/components/page-title';
import { ThemeToggle } from '@/components/theme-toggle';
import { getCurrentUser, getTenantBranding } from '@/lib/server-api';
import { formatRoles, getInitials } from '@/lib/roles';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, branding] = await Promise.all([getCurrentUser(), getTenantBranding()]);
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <Sidebar branding={branding} roles={user.roles} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-3">
          <PageTitle />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="h-8 w-px bg-border" />
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{formatRoles(user.roles)}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
              {getInitials(user.fullName)}
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
