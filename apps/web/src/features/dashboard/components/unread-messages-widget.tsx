'use client';

import Link from 'next/link';
import { useUnreadMessagesCount } from '@/features/messages/use-messages';
import { Card } from '@/components/ui/card';

export function UnreadMessagesWidget() {
  const { data: count, isLoading } = useUnreadMessagesCount();

  return (
    <Link href="/messages" className="block">
      <Card className="transition-colors hover:border-primary">
        <p className="text-[10px] uppercase tracking-wide text-primary">Mensajes</p>
        <p className="mt-1 text-2xl font-medium">{isLoading ? '…' : (count ?? 0)}</p>
        <p className="text-xs text-muted-foreground">sin leer</p>
      </Card>
    </Link>
  );
}
