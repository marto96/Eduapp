'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EventsList } from './events-list';
import { EventsTable } from './events-table';
import { EventsMonthView } from './events-month-view';

const VIEW_LABELS = {
  list: 'Vista lista',
  table: 'Vista tabla',
  month: 'Vista mes',
} as const;

export function EventsViewToggle({ canManage = false }: { canManage?: boolean }) {
  const [view, setView] = useState<'list' | 'table' | 'month'>('list');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {(['list', 'table', 'month'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              'px-3 py-2 text-sm transition-colors',
              view === v
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
      {view === 'list' && <EventsList canManage={canManage} />}
      {view === 'table' && <EventsTable />}
      {view === 'month' && <EventsMonthView />}
    </div>
  );
}
