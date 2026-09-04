'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, type NavGroup, type NavLink as NavLinkConfig } from '@/lib/nav-config';
import { useUnreadMessagesCount, useMessagesStream } from '@/features/messages/use-messages';

const STORAGE_KEY = 'sidebar-open-groups';
const FLYOUT_CLOSE_DELAY_MS = 150;

function visibleLinks(links: NavLinkConfig[], roles: string[]): NavLinkConfig[] {
  return links.filter((link) => link.roles.some((role) => roles.includes(role)));
}

function LinkRow({
  link,
  pathname,
  collapsed,
  indent,
  hasUnread,
  unreadCount,
}: {
  link: NavLinkConfig;
  pathname: string;
  collapsed: boolean;
  indent?: boolean;
  hasUnread: boolean;
  unreadCount: number;
}) {
  const Icon = link.icon;
  const isActive = pathname === link.href;

  return (
    <Link
      href={link.href}
      title={collapsed ? link.label : undefined}
      className={cn(
        'relative flex items-center gap-2.5 rounded px-2.5 py-2 transition-colors',
        collapsed && 'justify-center',
        indent && 'pl-8',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {collapsed ? (
        hasUnread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
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
}

export function NavLinks({ roles, collapsed = false }: { roles: string[]; collapsed?: boolean }) {
  const pathname = usePathname();
  const { data: unreadCount } = useUnreadMessagesCount();
  useMessagesStream();
  const hasUnreadMessages = !!unreadCount;

  // Grupos que el usuario abrió a mano — persistido, se hidrata en un
  // efecto (localStorage no existe en el render del servidor; ver el
  // mismo criterio aplicado en Sidebar/enroll-student-form).
  const [manuallyOpenGroups, setManuallyOpenGroups] = useState<Set<string>>(new Set());
  const [flyoutGroupId, setFlyoutGroupId] = useState<string | null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState<{ top: number; left: number } | null>(null);
  const groupButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
      setManuallyOpenGroups(new Set(stored));
    } catch {
      // localStorage inaccesible (modo privado, etc.) — se queda vacío.
    }
  }, []);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  function toggleGroup(id: string) {
    setManuallyOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignorado — persistencia es un plus, no un requisito
      }
      return next;
    });
  }

  function openFlyout(id: string) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    const el = groupButtonRefs.current[id];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setFlyoutPosition({ top: rect.top, left: rect.right + 8 });
    setFlyoutGroupId(id);
  }

  function scheduleCloseFlyout() {
    closeTimer.current = setTimeout(() => setFlyoutGroupId(null), FLYOUT_CLOSE_DELAY_MS);
  }

  function cancelCloseFlyout() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  const items = NAV_ITEMS.map((item) => {
    if (item.type === 'link') return item;
    return { ...item, links: visibleLinks(item.links, roles) };
  }).filter((item) => (item.type === 'link' ? item.roles.some((r) => roles.includes(r)) : item.links.length > 0));

  // El grupo de la ruta activa siempre se ve abierto — no depende de si el
  // usuario lo había cerrado a mano, para no esconder dónde está parado.
  const activeGroup = items.find(
    (item): item is { type: 'group' } & NavGroup =>
      item.type === 'group' && item.links.some((l) => l.href === pathname),
  );
  const openGroupIds = activeGroup
    ? new Set(manuallyOpenGroups).add(activeGroup.id)
    : manuallyOpenGroups;

  const flyoutGroup = items.find(
    (item): item is { type: 'group' } & NavGroup => item.type === 'group' && item.id === flyoutGroupId,
  );

  return (
    <nav className="flex flex-col gap-0.5 text-sm">
      {items.map((item) => {
        if (item.type === 'link') {
          return (
            <LinkRow
              key={item.href}
              link={item}
              pathname={pathname}
              collapsed={collapsed}
              hasUnread={item.href === '/messages' && hasUnreadMessages}
              unreadCount={unreadCount ?? 0}
            />
          );
        }

        const Icon = item.icon;
        const isOpen = openGroupIds.has(item.id);
        const groupHasUnread = item.links.some((l) => l.href === '/messages') && hasUnreadMessages;
        const groupHasActiveChild = item.links.some((l) => l.href === pathname);

        if (collapsed) {
          return (
            <button
              key={item.id}
              type="button"
              ref={(el) => {
                groupButtonRefs.current[item.id] = el;
              }}
              title={item.label}
              onMouseEnter={() => openFlyout(item.id)}
              onMouseLeave={scheduleCloseFlyout}
              className={cn(
                'relative flex items-center justify-center rounded px-2.5 py-2 transition-colors',
                groupHasActiveChild
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {groupHasUnread && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          );
        }

        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => toggleGroup(item.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded px-2.5 py-2 transition-colors',
                groupHasActiveChild
                  ? 'text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {groupHasUnread && !isOpen && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              <ChevronDown
                className={cn('ml-auto h-3.5 w-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')}
              />
            </button>
            {isOpen && (
              <div className="mt-0.5 flex flex-col gap-0.5">
                {item.links.map((link) => (
                  <LinkRow
                    key={link.href}
                    link={link}
                    pathname={pathname}
                    collapsed={false}
                    indent
                    hasUnread={link.href === '/messages' && hasUnreadMessages}
                    unreadCount={unreadCount ?? 0}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {collapsed &&
        flyoutGroup &&
        flyoutPosition &&
        createPortal(
          <div
            role="menu"
            onMouseEnter={cancelCloseFlyout}
            onMouseLeave={scheduleCloseFlyout}
            style={{ top: flyoutPosition.top, left: flyoutPosition.left }}
            className="fixed z-50 w-48 rounded-md border border-border bg-surface p-1.5 shadow-lg"
          >
            <p className="truncate px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
              {flyoutGroup.label}
            </p>
            {flyoutGroup.links.map((link) => (
              <LinkRow
                key={link.href}
                link={link}
                pathname={pathname}
                collapsed={false}
                hasUnread={link.href === '/messages' && hasUnreadMessages}
                unreadCount={unreadCount ?? 0}
              />
            ))}
          </div>,
          document.body,
        )}
    </nav>
  );
}
