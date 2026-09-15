'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useUnreadMessagesCount } from '@/features/messages/use-messages';
import { StatCard } from '@/components/ui/stat-card';

export function UnreadMessagesWidget() {
  const { data: count, isLoading } = useUnreadMessagesCount();

  return (
    <Link href="/messages" className="block">
      <StatCard
        icon={MessageCircle}
        className="transition-colors hover:border-primary"
        label="Mensajes"
        value={isLoading ? '…' : (count ?? 0)}
        caption="sin leer"
      />
    </Link>
  );
}
