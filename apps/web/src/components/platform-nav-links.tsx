'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PLATFORM_NAV_LINKS } from '@/lib/platform-nav-config';

export function PlatformNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 text-sm">
      {PLATFORM_NAV_LINKS.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-2.5 rounded px-2.5 py-2 transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
