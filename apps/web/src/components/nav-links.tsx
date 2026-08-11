'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_LINKS } from '@/lib/nav-config';
import { useUnreadMessagesCount } from '@/features/messages/use-messages';

export function NavLinks({ roles }: { roles: string[] }) {
  const pathname = usePathname();
  const { data: unreadCount } = useUnreadMessagesCount();
  const links = NAV_LINKS.filter((link) => link.roles.some((role) => roles.includes(role)));

  return (
    <nav className="flex flex-col gap-0.5 text-sm">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
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
            {link.href === '/messages' && !!unreadCount && (
              <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
