import { NavLinks } from '@/components/nav-links';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <NavLinks />
      </header>
      {children}
    </div>
  );
}
