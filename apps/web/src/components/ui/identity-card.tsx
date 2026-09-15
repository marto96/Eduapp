import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function IdentityCard({
  avatar,
  name,
  status,
  rows,
  className,
}: {
  avatar: ReactNode;
  name: string;
  status?: { label: string; dotClassName: string };
  rows: { icon: LucideIcon; text: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3">
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{name}</p>
          {status && (
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dotClassName)} />
              <span className="text-xs text-muted-foreground">{status.label}</span>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <row.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{row.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
