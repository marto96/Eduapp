'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_LINKS } from '@/lib/nav-config';
import { useUnreadMessagesCount, useMessagesStream } from '@/features/messages/use-messages';

export function NavLinks({ roles, collapsed = false }: { roles: string[]; collapsed?: boolean }) {
  const pathname = usePathname();
  const { data: unreadCount } = useUnreadMessagesCount();
  useMessagesStream();
  const links = NAV_LINKS.filter((link) => link.roles.some((role) => roles.includes(role)));

  return (
    <nav className="flex flex-col gap-0.5 text-sm">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        const hasUnread = link.href === '/messages' && !!unreadCount;
        return (
          <Link
            key={link.href}
            href={link.href}
            title={collapsed ? link.label : undefined}
            className={cn(
              'relative flex items-center gap-2.5 rounded px-2.5 py-2 transition-colors',
              collapsed && 'justify-center',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {collapsed ? (
              hasUnread && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
              )
            ) : (
              <>
                <span className="truncate">{link.label}</span>
                {hasUnread && (
                  <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-background">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
