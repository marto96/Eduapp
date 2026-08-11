'use client';

import { usePathname } from 'next/navigation';
import { NAV_LINKS } from '@/lib/nav-config';

export function PageTitle() {
  const pathname = usePathname();
  const current = NAV_LINKS.find((link) => link.href === pathname);

  return <span className="text-sm font-medium">{current?.label ?? 'EduApp'}</span>;
}
