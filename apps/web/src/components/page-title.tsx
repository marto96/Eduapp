'use client';

import { usePathname } from 'next/navigation';
import { ALL_NAV_LINKS } from '@/lib/nav-config';

export function PageTitle() {
  const pathname = usePathname();
  const current = ALL_NAV_LINKS.find((link) => link.href === pathname);

  return <span className="text-sm font-medium">{current?.label ?? 'Skolaria'}</span>;
}
