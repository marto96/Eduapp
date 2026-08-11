'use client';

import { usePathname } from 'next/navigation';
import { PLATFORM_NAV_LINKS } from '@/lib/platform-nav-config';

export function PlatformPageTitle() {
  const pathname = usePathname();
  const current = PLATFORM_NAV_LINKS.find(
    (link) => pathname === link.href || pathname?.startsWith(`${link.href}/`),
  );

  return <span className="text-sm font-medium">{current?.label ?? 'Plataforma'}</span>;
}
