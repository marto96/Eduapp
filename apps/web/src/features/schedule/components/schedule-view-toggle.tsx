'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { SchedulesList } from './schedules-list';
import { ScheduleGrid } from './schedule-grid';

export function ScheduleViewToggle({
  currentUserId,
  canManage,
}: {
  currentUserId?: string;
  canManage: boolean;
}) {
  const [view, setView] = useState<'list' | 'grid'>('list');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {(['list', 'grid'] as const).map((v) => (
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
            {v === 'list' ? 'Vista lista' : 'Vista por curso'}
          </button>
        ))}
      </div>
      {view === 'list' ? (
        <SchedulesList currentUserId={currentUserId} canManage={canManage} />
      ) : (
        <ScheduleGrid currentUserId={currentUserId} canManage={canManage} />
      )}
    </div>
  );
}
